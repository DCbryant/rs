import React from './react'
import ReactDOM from 'react-dom'

function sayHello() {
  alert('hello')
}

// <button id="btn">click<b>hello</b></button>
// const element = React.createElement('button', {id: 'btn', onClick: sayHello}, 'click', 
//   React.createElement('b', {}, 'hello'),
// )

class Counter extends React.Component{
  constructor(props) {
    super(props)
    this.state = {number: 0}
  }

  componentWillMount() {
    // console.log('componentWillMount')
  }

  componentDidMount() {
    // console.log('componentDidMount')
    // setInterval(() => {
    //   this.setState({number: this.state.number + 1})
    // }, 1000)
  }

  // shouldComponentUpdate(nexrProps, nextState) {
  //   return true
  // }

  handleClick = () => {
    this.setState({number: this.state.number + 1})
  }

  render() {
    const p = React.createElement('p',{}, this.state.number)
    const button = React.createElement('button',{onClick: this.handleClick}, 'add')
    const div = React.createElement('div', {id: 'counter'}, p, button)
    return div
    // return this.state.number
  }
}

const element = React.createElement(Counter)

React.render(element, document.getElementById('root'))
