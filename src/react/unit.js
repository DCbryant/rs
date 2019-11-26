import $ from 'jquery'
// import Component from './component'

// 工厂方法，根据参数生产不同类型的实例，这些实例都是同一个父类的子类
function createReactUnit(element) {
  
  if (typeof element === 'string' || typeof element == 'number') {
    return new ReactTextUnit(element)
  }
  // {type: 'button', props: {}} //原生dom节点
  if (typeof element === 'object' && typeof element.type === 'string') {
    return new ReactNativeUnit(element)
  }
  if (typeof element === 'object' && typeof element.type === 'function') {
    return new ReacCompositeUnit(element)
  }
}

class Unit {
  constructor(element) {
    this._currElement = element
  }
}

class ReactTextUnit extends Unit {
  getMarkUp(rootId) {
    this._rootId = rootId
    return `<span data-reactid="${rootId}">${this._currElement}</span>`
  }
  update(nextElement) {
    if(this._currElement !== nextElement) {
      this._currElement = nextElement
      $(`[data-reactid="${this._rootId}"]`).html(this._currElement)
    }
  }
}

class ReactNativeUnit extends Unit {
  getMarkUp(rootId) {
    this._rootId = rootId
    const {type, props} = this._currElement
    let tagStart = `<${type} data-reactid="${rootId}" `
    let childString = ''
    let tagEnd = `</${type}>`
    let renderedChildren = []
    for (const propKey in props) {
      if (/^on[A-Za-z]+/.test(propKey)) {
        const eventType = propKey.slice(2).toLowerCase()
        $(document).delegate(`[data-reactid="${rootId}"]`, `${eventType}.${rootId}`, props[propKey])
      } else if (propKey === 'children') {
        const children = props.children || []
        childString = children.map((child, index) => {
          let childReactUnit = createReactUnit(child)
          renderedChildren.push(childReactUnit)
          let childMarkUp = childReactUnit.getMarkUp(`${rootId}-${index}`)
          return childMarkUp
        }).join('')
      } else {
        tagStart += (' ' + propKey + '=' + props[propKey])
      }
    }
    this.renderedChildren = renderedChildren
    return tagStart + '>' + childString + tagEnd
  }

  update(nextElement) {
    this._currElement = nextElement
    // 获取旧的属性对象
    const oldProps = this._currElement.props
    // 获取新的属性对象
    const newProps = nextElement.props
    // 修改属性对象
    this.updateProperties(oldProps, newProps)
    // 更新子元素
    this.updateChildren(newProps.children)
  }

  // 执行这个方法的时候，属性是直接操作dom改掉了
  updateProperties(oldProps, newProps) {
    let propKey
    for (propKey in oldProps) {
      if (!newProps.hasOwnProperty(propKey)) {
        $(`[data-reactid="${this._rootId}"]`).removeAttr(propKey)
      }
      if (/^on[A-Za-z]+/.test(propKey)) {
        $(document).undelegate('.' + this._rootId)
      }
    }

    for (propKey in newProps) {
      if (propKey === 'children') continue
      // 重新绑定事件
      if (/^on[A-Za-z]+/.test(propKey)) {
        const eventType = propKey.slice(2).toLowerCase()
        $(document).delegate(`[data-reactid="${this._rootId}"]`, `${eventType}.${this._rootId}`, newProps[propKey])
        continue
      }
      // 更新新的属性
      $(`[data-reactid="${this._rootId}"]`).prop(propKey, newProps[propKey])
    }
  }

  updateChildren(newChildrenEle) {
    this.diff(newChildrenEle)
  }

  diff(newChildrenEle) {
    // 为了判断新的元素在旧的元素里有没有
    const oldChildrenMap = this.getChildrenMap(this.renderedChildren)
    this.getNewChildren(oldChildrenMap, newChildrenEle)
  }

  // 这个方法的作用是获取新的虚拟dom，还会直接修改匹配的属性
  getNewChildren(oldChildrenMap, newChildrenEle) {
    const newChildren = []
    newChildrenEle.forEach((newElement, idx) => {
      const newKey = (newElement.props && newElement.props.key) || idx.toString() //这里的key写错了
      // 通过key找到旧的unit
      const oldChild = oldChildrenMap[newKey]
      const oldElement = oldChild && oldChild._currElement
      // 比较新旧的元素是否一样，如果是一样，可以进行深度比较
      if (shouldDeepCompare(oldElement, newElement)) {
        oldChild.update(newElement)
        // 如果当前的key在老的集合里，则可以复用旧的unit
        newChildren[idx] = oldChild
      } else {
        const newChildInstance = createReactUnit(newElement)
        newChildren[idx] = newChildInstance
      }
    })
    return newChildren
  }

  getChildrenMap(children) {
    const childrenMap = {}
    for (let i = 0; i < children.length; i++) {
      const key = (children[i]._currElement.props && children[i]._currElement.props.key || i.toString())
      childrenMap[key] = children[i]
    }
    return childrenMap
  }
}

class ReacCompositeUnit extends Unit {
  // 一个虚拟dom，element的实例，但是最终还是要落实到native或text上
  getMarkUp(rootId) {
    this._rootId = rootId
    const {type: Component, props} = this._currElement
    // 创建组件的实例
    const componentInstance = this._componentInstance = new Component(props)
    // 让此组件的实例的unit属性指向自己这个unit
    this._componentInstance.unit = this
    componentInstance.componentWillMount && componentInstance.componentWillMount() 
    // 得到返回的虚拟dom，react元素
    const renderedElement = componentInstance.render()
    // 获取要渲染的单元实例
    const renderedUnitInstance = this._renderedUnitInstance = createReactUnit(renderedElement)
    // 获取对应的markup
    const renderedMarkUp = renderedUnitInstance.getMarkUp(rootId)
    $(document).on('mounted', () => {
      componentInstance.componentDidMount && componentInstance.componentDidMount() 
    })
    return renderedMarkUp
  }

  // 更新有两种可能，新元素或新状态
  update(nextElement, partialState) {
    this._currElement = nextElement || this._currElement
    const nextState = this._componentInstance.state = Object.assign(this._componentInstance.state, partialState)
    const nextProps = this._currElement.props //新的属性对象
    if ( this._componentInstance.shouldComponentUpdate && !this._componentInstance.shouldComponentUpdate(nextProps, nextState)) {
      return;
    }
    // 执行组件将要更新的生命周期函数
    this._componentInstance.componentWillUpdate && this._componentInstance.componentWillUpdate()
    // 老的render出来的unit的元素
    const preRendererUnitInstance = this._renderedUnitInstance
    const preRenderedElement = preRendererUnitInstance._currElement
    const nextRenderElement = this._componentInstance.render()
    if (shouldDeepCompare(preRenderedElement, nextRenderElement)) {
      // ReacCompositeUnit不是自己干活
      preRendererUnitInstance.update(nextRenderElement)
      this._componentInstance.componentDidUpdate && this._componentInstance.componentDidUpdate()
    } else { //如果不需要深度比较，直接删除老的，重建新的
      // 根据新的react元素创建新的instance实例并且直接重建新的节点
      this._renderedUnitInstance = createReactUnit(nextRenderElement)
      const nextMarkUp = this._renderedUnitInstance.getMarkUp(this._rootId)
      $(`[data-reactid="${this._rootId}"]`).replaceWith(nextMarkUp)
    }
  }
}

function shouldDeepCompare(oldEle, newEle) {
  if (oldEle != null && newEle != null) {
    const oldType = typeof oldEle
    const newType = typeof newEle
    if (oldType === 'string' || oldType === 'number') {
      return newType === 'string' || newType === 'number'
    } else {
      return newType === 'object' && oldEle.type === newEle.type
    }
  } else {
    // 此时不用进行深度对比
    return false
  }
}


export {
  createReactUnit
}