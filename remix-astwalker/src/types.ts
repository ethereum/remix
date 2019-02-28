export interface Node {
  ast: any | null,
  source: string | null
}

export interface AstNode {
  id: number
  name: string
  src: string
  children: Array<AstNode>
  attributes: AstNodeAtt
}

export interface AstNodeAtt {
  operator: string
  string: null
  type: string
  value: string
  constant: boolean
  name: string
  public: boolean
}
