class Component {
  constructor(props) { 
    this.props = props //接收子类传递过来的props
  }
  setState = (partialState) => {
    // 修改状态
    this.unit.update(null, partialState)
  }
}


export default Component