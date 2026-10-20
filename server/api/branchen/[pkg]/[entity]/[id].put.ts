import { kitUpdate } from '../../../../utils/branchKitStore'
export default defineEventHandler(event => kitUpdate(event))
