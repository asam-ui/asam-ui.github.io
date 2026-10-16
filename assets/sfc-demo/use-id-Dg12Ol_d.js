import{_ as e,g as t}from"./dist-Cf9tXLjG.js";import{B as n,I as r,Pt as i}from"./sfc-demo.js";import{t as a}from"./error-BI73FMND.js";import{n as o}from"./use-namespace-CdHxaFSL.js";var s={prefix:Math.floor(Math.random()*1e4),current:0},c=Symbol(`elIdInjection`),l=()=>r()?n(c,s):s,u=n=>{let r=l();!e&&r===s&&a(`IdInjection`,`Looks like you are using server rendering, you must provide a id provider to ensure the hydration process to be succeed
usage: app.provide(ID_INJECTION_KEY, {
  prefix: number,
  current: number,
})`);let c=o();return t(()=>i(n)||`${c.value}-id-${r.prefix}-${r.current++}`)};export{l as n,u as t};