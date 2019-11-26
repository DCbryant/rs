import $ from 'jquery'
import {createReactUnit} from './unit'
import createElement from './element'
import Component from './component'

const React = {
  render,
  nextRootIndex: 0, //下一个根节点索引
  createElement,
  Component,
}

function render(element, container) {
  // 为了以后扩展方便，定义一个工厂实例，只要传入element，里面就可以返回正确的实例
  // container.innerHTML = `<span data-reactid="${React.nextRootIndex}">${element}</span>`
  const unitInstance = createReactUnit(element)
  // 通过实例获取对应的html片段
  const markup = unitInstance.getMarkUp(React.nextRootIndex)
  $(container).html(markup)
  // 触发一个自定义事件
  $(document).trigger('mounted')
}



export default React