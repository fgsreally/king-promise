import { General } from "../general"
import { Soldier } from "../soldier"

export class King {
  static type = 'king'
  static soldiers: Map<string, Soldier<(...args: any) => Promise<any>>> = new Map()
  static generals: Map<string, General<any>> = new Map()
  static register(name: string, obj: General<any> | Soldier<(...args: any) => Promise<any>>) {
    if (obj.type === 'general') {
      if (King.generals.has(name)) throw new Error(`General [${name}] has been registered`)
      King.generals.set(name, obj as General<any>)
    }
    if (obj.type === 'soldier') {
      if (King.soldiers.has(name)) throw new Error(`Soldier [${name}] has been registered`)
      King.soldiers.set(name, obj as Soldier<any>)
    }
  }

  static find(name: string, type?: 'soldier' | 'general'):General<any>|Soldier<any>|void {
    if (!type) return King.generals.get(name,) || King.soldiers.get(name,)

    return (King as any)[`${type}s`].get(name,)
  }
}