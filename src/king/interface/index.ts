import { GeneralConfig } from "../../general/interface/index";
import { TaskOptions } from "../../interface";
interface KingConfig {
  isDev: boolean;
  routes: string[];
  services: Service[];
}

interface Service {
  name: string;
  input: Object;
  output: Object;
  option: TaskOptions;
  generals: string[];
  type: string;
  address: string[];
  weight?:number[];
}

// isdev: true;
// route: [];
// service: [
//   {
//     name: "",
//     input: {},
//     output: {},
//     gender: [],
//     option,
//     type: "http",
//     address: [],
//   },
// ];

export { KingConfig, Service };
