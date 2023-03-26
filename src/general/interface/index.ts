export interface GeneralConfig {
  route: String;
  description: String;
  services: Service[][];
  long: Service[];
}
export interface Service {
  name: String;
  map?: Function;
  schema?: JSON;
}
