function createElement(type, props = {}, ...children) {
  props.children = children //chiildren是props的属性
  return new Element(type, props)
}


class Element {
  constructor(type, props) {
    this.type = type
    this.props = props
    this.key = props.key
  }
}

export default createElement