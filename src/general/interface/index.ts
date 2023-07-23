export interface GeneralConfig {
  route: string
  description: string
  services: Service[][]
  long: Service[]
}
export interface Service {
  name: string
  map?: Function
  schema?: JSON
}
