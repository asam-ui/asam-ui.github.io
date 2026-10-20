import{Ct as e,T as t,k as n}from"./vue.esm-bundler-5NdF0u5k.js";import{F as r,P as i,W as a,p as o}from"./sfc-demo.js";var s={prefix:Math.floor(Math.random()*1e4),current:0},c=Symbol(`elIdInjection`),l=()=>t()?n(c,s):s,u=t=>{let n=l();!r&&n===s&&a(`IdInjection`,`Looks like you are using server rendering, you must provide a id provider to ensure the hydration process to be succeed
usage: app.provide(ID_INJECTION_KEY, {
  prefix: number,
  current: number,
})`);let c=o();return i(()=>e(t)||`${c.value}-id-${n.prefix}-${n.current++}`)};export{l as n,u as t};