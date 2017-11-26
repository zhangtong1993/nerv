// tslint:disable-next-line:max-line-length
import {
  isVNode,
  isVText,
  isStateless,
  isNullOrUndef,
  isInvalid,
  isComposite
} from './is'
import { isString, isNumber, isFunction, isArray } from 'nerv-utils'
import {
  encodeEntities,
  isVoidElements,
  escapeText,
  getCssPropertyName,
  isUnitlessNumber,
  extend
} from './utils'

const skipAttributes = {
  ref: true,
  key: true,
  children: true
}

function hashToClassName (obj) {
  const arr: string[] = []
  for (const i in obj) {
    if (obj[i]) {
      arr.push(i)
    }
  }
  return arr.join(' ')
}

function renderStylesToString (styles: string | object): string {
  if (isString(styles)) {
    return styles
  } else {
    let renderedString = ''
    for (const styleName in styles) {
      const value = styles[styleName]

      if (isString(value)) {
        renderedString += `${getCssPropertyName(styleName)}${value};`
      } else if (isNumber(value)) {
        renderedString += `${getCssPropertyName(
          styleName
        )}${value}${isUnitlessNumber[styleName] ? '' : 'px'};`
      }
    }
    return renderedString
  }
}

function renderVNodeToString (vnode, parent, context, firstChild) {
  const { type, props, children } = vnode
  if (isVText(vnode)) {
    return encodeEntities(vnode.text)
  } else if (isVNode(vnode)) {
    let renderedString = `<${type}`
    let html
    if (!isNullOrUndef(props)) {
      for (const prop in props) {
        const value = props[prop]
        if (skipAttributes[prop]) {
          continue
        }
        if (prop === 'dangerouslySetInnerHTML') {
          html = value.__html
        } else if (prop === 'style') {
          const styleStr = renderStylesToString(value)
          renderedString += styleStr ? ` style="${renderStylesToString(value)}"` : ''
        } else if (prop === 'class' || prop === 'className') {
          renderedString += ` class="${isString(value)
            ? value
            : hashToClassName(value)}"`
        } else if (prop === 'defaultValue') {
          if (!props.value) {
            renderedString += ` value="${escapeText(value)}"`
          }
        } else if (prop === 'defaultChecked') {
          if (!props.checked) {
            renderedString += ` checked="${value}"`
          }
        } else {
          if (isString(value)) {
            renderedString += ` ${prop}="${escapeText(value)}"`
          } else if (isNumber(value)) {
            renderedString += ` ${prop}="${value}"`
          } else if (value === true) {
            renderedString += ` ${prop}`
          }
        }
      }
    }
    if (isVoidElements[type]) {
      renderedString += `/>`
    } else {
      renderedString += `>`
      if (!isInvalid(children)) {
        if (isString(children)) {
          renderedString += children === '' ? ' ' : escapeText(children)
        } else if (isNumber(children)) {
          renderedString += children + ''
        } else if (isArray(children)) {
          for (let i = 0, len = children.length; i < len; i++) {
            const child = children[i]
            if (isString(child)) {
              renderedString += child === '' ? ' ' : escapeText(child)
            } else if (isNumber(child)) {
              renderedString += child
            } else if (!isInvalid(child)) {
              renderedString += renderVNodeToString(
                child,
                vnode,
                context,
                i === 0
              )
            }
          }
        } else {
          renderedString += renderVNodeToString(children, vnode, context, true)
        }
      } else if (html) {
        renderedString += html
      }
      if (!isVoidElements[type]) {
        renderedString += `</${type}>`
      }
    }
    return renderedString
  } else if (isComposite(vnode)) {
    const instance = new type(props, context)
    instance._disable = true
    if (isFunction(instance.getChildContext)) {
      context = extend(extend({}, context), instance.getChildContext())
    }
    instance.context = context
    if (isFunction(instance.componentWillMount)) {
      instance.componentWillMount()
    }
    const nextVnode = instance.render(props, instance.state, context)

    if (isInvalid(nextVnode)) {
      return '<!--!-->'
    }
    return renderVNodeToString(nextVnode, vnode, context, true)
  } else if (isStateless(vnode)) {
    const nextVnode = type(props, context)

    if (isInvalid(nextVnode)) {
      return '<!--!-->'
    }
    return renderVNodeToString(nextVnode, vnode, context, true)
  }
}

export function renderToString (input: any): string {
  return renderVNodeToString(input, {}, {}, true) as string
}

export function renderToStaticMarkup (input: any): string {
  return renderVNodeToString(input, {}, {}, true) as string
}