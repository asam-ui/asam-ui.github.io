import{D as e,Tt as t,j as n}from"./sfc-demo.js";import{t as r}from"./error-DSg9eOJF.js";import{_ as i,g as a}from"./dist-CWqMDESo.js";import{n as o}from"./use-namespace-BhajIwIV.js";var s={prefix:Math.floor(Math.random()*1e4),current:0},c=Symbol(`elIdInjection`),l=()=>e()?n(c,s):s,u=e=>{let n=l();!i&&n===s&&r(`IdInjection`,`Looks like you are using server rendering, you must provide a id provider to ensure the hydration process to be succeed
usage: app.provide(ID_INJECTION_KEY, {
  prefix: number,
  current: number,
})`);let c=o();return a(()=>t(e)||`${c.value}-id-${n.prefix}-${n.current++}`)};export{l as n,u as t};