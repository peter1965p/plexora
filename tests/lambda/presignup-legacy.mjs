// STAND DER LIVE-LAMBDA VOM 24.07.2026 (vor der Korrektur), nur als Beleg für den Angriff "Vorab-Registrierung" in presignup.test.ts. NICHT deployen.
import { CognitoIdentityProviderClient, ListUsersCommand, AdminLinkProviderForUserCommand, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({ region: "eu-central-1" });

// Pre-Sign-up-Trigger: verknüpft einen neuen föderierten Login (z.B. Google) automatisch
// mit einem bereits bestehenden nativen (Passwort-)Konto derselben, verifizierten E-Mail.
// Ohne diesen Schritt legt Cognito bei Google-Login IMMER ein zweites, unverknüpftes
// Nutzerprofil an (Username "Google_<sub>"), selbst wenn die E-Mail übereinstimmt.
export const handler = async (event) => {
  if (event.triggerSource !== "PreSignUp_ExternalProvider") return event;

  const userPoolId = event.userPoolId;
  const userName = event.userName;
  const email = event.request?.userAttributes?.email;
  const emailVerified = event.request?.userAttributes?.email_verified;

  // Nur bei einer vom Provider als verifiziert gemeldeten E-Mail verknüpfen — sonst
  // könnte sich jemand mit einer fremden, nicht bestätigten Adresse in ein bestehendes
  // Konto einklinken.
  const isVerified = emailVerified === "true" || emailVerified === true;
  if (!email || !isVerified) {
    console.log("Pre-signup: keine verifizierte E-Mail, kein Linking:", email, emailVerified);
    return event;
  }

  try {
    const res = await cognito.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    }));

    // Nur ein bereits bestehendes NATIVES Konto ist ein gültiges Link-Ziel — andere
    // föderierte Nutzer (Username-Präfix "google_", Cognito senkt den Provider-Präfix
    // im zusammengesetzten Username klein) werden übersprungen.
    const nativeUser = (res.Users || []).find(u => !u.Username.toLowerCase().startsWith("google_"));

    if (nativeUser) {
      // ProviderName muss exakt (Groß-/Kleinschreibung) dem am Pool registrierten
      // Identity Provider entsprechen ("Google") — der Username-Präfix ist das NICHT,
      // Cognito legt zusammengesetzte Usernames kleingeschrieben an.
      const providerName = "Google";
      const providerUserId = userName.slice(providerName.length + 1);

      await cognito.send(new AdminLinkProviderForUserCommand({
        UserPoolId: userPoolId,
        DestinationUser: {
          ProviderAttributeValue: nativeUser.Username,
          ProviderName: "Cognito",
        },
        SourceUser: {
          ProviderAttributeName: "Cognito_Subject",
          ProviderAttributeValue: providerUserId,
          ProviderName: providerName,
        },
      }));
      console.log("Verknüpft mit bestehendem Konto:", nativeUser.Username, "<-", userName);

      // Cognito übernimmt die Attribut-Zuordnung des Identity Providers NUR beim
      // eigentlichen Anlegen eines Nutzers — bei Verknüpfung mit einem bereits
      // bestehenden Zielkonto (dieser Fall) nicht automatisch. Profildaten wie das
      // Google-Profilbild deshalb hier explizit auf das Zielkonto übertragen.
      const picture = event.request?.userAttributes?.picture;
      if (picture) {
        await cognito.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: nativeUser.Username,
          UserAttributes: [{ Name: "picture", Value: picture }],
        }));
        console.log("Profilbild übernommen für:", nativeUser.Username);
      }
    } else {
      console.log("Kein bestehendes natives Konto gefunden, neuer eigenständiger Nutzer:", userName);
    }
  } catch (err) {
    // Linking-Fehler darf den Sign-up-Vorgang selbst nicht blockieren — im schlimmsten
    // Fall entsteht ein unverknüpftes Zweitkonto, was besser ist als ein kompletter
    // Login-Ausfall für den Nutzer.
    console.error("Account-Linking fehlgeschlagen:", err.message);
  }

  event.response.autoConfirmUser = true;
  if (email) event.response.autoVerifyEmail = true;

  return event;
};
