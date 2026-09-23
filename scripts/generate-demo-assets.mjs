import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {root} from './env.mjs';

// Code-drawn illustrations, not patient photographs or model-generated diagnoses.
const target=path.join(root,'apps/api/prisma/demo-assets');
await fs.mkdir(target,{recursive:true});
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const scenes=[
  {id:1,type:'mole',seed:42,skin:'#d6a68b',shadow:'#aa7460',variant:0,label:'Bilak · 1-kuzatuv'},
  {id:2,type:'mole',seed:42,skin:'#dfb397',shadow:'#ad7964',variant:1,label:'Bilak · 2-kuzatuv'},
  {id:3,type:'dry',seed:67,skin:'#c4987e',shadow:'#956c57',variant:0,label:'Qo‘l · 1-kuzatuv'},
  {id:4,type:'dry',seed:67,skin:'#cda388',shadow:'#986c5d',variant:1,label:'Qo‘l · 2-kuzatuv'},
  {id:5,type:'spots',seed:81,skin:'#bd8f73',shadow:'#8e6350',variant:0,label:'Yuz · namuna'},
  {id:6,type:'ring',seed:104,skin:'#ac7c5f',shadow:'#704b39',variant:0,label:'Oyoq · namuna'},
  {id:7,type:'dry',seed:119,skin:'#e3bca2',shadow:'#c59880',variant:0,label:'Yorug‘lik · qayta surat olish',blur:true},
  {id:8,type:'mole',seed:153,skin:'#9c6b50',shadow:'#684a39',variant:1,label:'Yelka · namuna'},
];
for(const scene of scenes){
  const rnd=random(scene.seed);const details=[];
  for(let i=0;i<1600;i++){
    const x=Math.round(rnd()*900),y=Math.round(rnd()*650),radius=(rnd()*1.4+0.3).toFixed(2);
    details.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${i%3===0?'#f5ddc4':scene.shadow}" opacity="${(rnd()*0.18+0.02).toFixed(2)}"/>`);
  }
  for(let i=0;i<28;i++){const x=80+rnd()*760,y=90+rnd()*450;details.push(`<path d="M${x},${y} q${5+rnd()*10},-7 ${11+rnd()*12},-17" fill="none" stroke="#6a4d3b" stroke-width="0.65" opacity=".18"/>`);}
  let mark='';
  if(scene.type==='mole'){
    mark=`<g transform="translate(446 310) rotate(-12)"><path d="M-54,-38 C-20,-66 34,-64 62,-27 C88,8 54,53 18,58 C-19,65 -65,43 -69,7 C-72,-13 -66,-27 -54,-38Z" fill="#ae795e" opacity=".3" filter="url(#soft)"/><path d="M-43,-28 C-14,-46 30,-41 46,-19 C62,5 39,35 13,40 C-17,46 -45,31 -49,7 C-52,-8 -53,-18 -43,-28Z" fill="url(#pigment)"/><ellipse cx="-7" cy="-4" rx="27" ry="23" fill="#704b37" opacity=".35" filter="url(#soft)"/><ellipse cx="21" cy="19" rx="9" ry="7" fill="#b88a66" opacity=".38"/></g>`;
  }else if(scene.type==='dry'){
    mark='<g>';
    for(let i=0;i<115;i++){const angle=rnd()*Math.PI*2,r=Math.sqrt(rnd()),x=440+Math.cos(angle)*r*165,y=305+Math.sin(angle)*r*105;mark+=`<ellipse cx="${x}" cy="${y}" rx="${8+rnd()*26}" ry="${5+rnd()*15}" fill="${i%3===0?'#cf7665':'#e4a29a'}" opacity="${scene.variant?.10:.17}" filter="url(#soft)"/>`;if(i%3===0)mark+=`<path d="M${x},${y} l12,-2 l-3,4 l-13,1Z" fill="#f3d2be" opacity=".42"/>`;}
    mark+='</g>';
  }else if(scene.type==='spots'){
    mark='<g>';
    for(let i=0;i<23;i++){const x=230+rnd()*450,y=150+rnd()*340,r=4+rnd()*8;mark+=`<circle cx="${x}" cy="${y}" r="${r*1.9}" fill="#a65850" opacity=".14" filter="url(#soft)"/><circle cx="${x}" cy="${y}" r="${r}" fill="#b77763" opacity=".7"/><circle cx="${x-1}" cy="${y-1}" r="${r/3}" fill="#dca485" opacity=".9"/>`;}
    mark+='</g>';
  }else{
    mark='<g transform="translate(445 310) rotate(-18)"><ellipse rx="135" ry="87" fill="none" stroke="#b56f60" stroke-width="23" opacity=".3" filter="url(#soft)"/><ellipse rx="128" ry="81" fill="none" stroke="#cb9680" stroke-width="5" stroke-dasharray="9 4 13 2" opacity=".5"/><ellipse rx="94" ry="55" fill="#b48466" opacity=".22"/></g>';
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><defs><radialGradient id="skin" cx="43%" cy="38%" r="80%"><stop stop-color="${scene.skin}"/><stop offset="1" stop-color="${scene.shadow}"/></radialGradient><radialGradient id="pigment"><stop stop-color="#71503d"/><stop offset=".6" stop-color="#866047"/><stop offset="1" stop-color="#a17756"/></radialGradient><filter id="soft"><feGaussianBlur stdDeviation="3"/></filter><filter id="blur"><feGaussianBlur stdDeviation="16"/></filter></defs><g ${scene.blur?'filter="url(#blur)"':''}><rect width="900" height="650" fill="url(#skin)"/><path d="M-100 540 Q360 415 995 555" stroke="#fff2dc" stroke-width="170" opacity=".07" fill="none"/>${details.join('')}${mark}</g><rect x="22" y="22" width="138" height="42" rx="12" fill="#123f3d" opacity=".9"/><text x="91" y="50" fill="#fff" font-size="20" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle">DEMO</text><rect y="575" width="900" height="75" fill="#f5f4ee" opacity=".96"/><text x="28" y="606" font-family="Arial,sans-serif" font-size="18" font-weight="600" fill="#234f46">${scene.label}</text><text x="28" y="632" font-family="Arial,sans-serif" font-size="15" fill="#516e64">Sintetik illustratsiya. Haqiqiy bemor surati va tibbiy natija emas.</text></svg>`;
  await fs.writeFile(path.join(target,`image${scene.id}.svg`),svg);
  await sharp(Buffer.from(svg)).jpeg({quality:88,mozjpeg:true}).toFile(path.join(target,`image${scene.id}.jpg`));
}
console.log('8 deterministic, DEMO-labelled illustration assets generated; no patient photos or external AI calls.');
