import '../src/config';
import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { projectRoot, config } from '../src/config';
import { StorageService } from '../src/storage.service';
import { MlService } from '../src/ml.service';

class SeedError extends Error {}
const id = (name:string) => {
  const hex=createHash('sha256').update(`dermatolog:demo:v1:${name}`).digest('hex').slice(0,32).split('');
  hex[12]='5';hex[16]='a';const v=hex.join('');
  return `${v.slice(0,8)}-${v.slice(8,12)}-${v.slice(12,16)}-${v.slice(16,20)}-${v.slice(20)}`;
};
const users=[
  {key:'aziz',email:'demo@dermatolog.test',password:'Demo2026!Teri',name:'Aziz Karimov (Demo)',role:'USER'},
  {key:'madina',email:'madina@dermatolog.test',password:'Madina2026!Teri',name:'Madina Usmonova (Demo)',role:'USER'},
  {key:'admin',email:'admin@dermatolog.test',password:'Admin2026!Teri',name:'Demo Administrator',role:'ADMIN'},
];
const cases=[
  {key:'aziz-mole',owner:'aziz',title:'Chap bilakdagi xol',place:'Chap bilak',code:'NEVUS',summary:'Namuna ssenariyda bir joy ikki xil sanada qayd etilgan. Markazdagi pigmentli belgi bir xil rakursda solishtirish uchun chizilgan.',observation:'Bir joyning avvalgi va keyingi illustratsiyasi mavjud.',note:'Bir xil yorug‘lik va masofada kuzatuvni davom ettirish uchun eslatma.',itching:'NO'},
  {key:'aziz-hand',owner:'aziz',title:'Qo‘l ustidagi quruqlik',place:'O‘ng qo‘l usti',code:'ECZEMA_DERMATITIS',summary:'Namuna illustratsiyada quruqlik va qizarishga o‘xshash ko‘rinish chizilgan. Bu haqiqiy dermatit tashxisi emas.',observation:'Turli sanalardagi quruqlik namunalari yonma-yon ko‘rishga tayyor.',note:'Kechqurun qichishish sezilgani haqidagi xayoliy kundalik yozuvi.',itching:'YES'},
  {key:'aziz-face',owner:'aziz',title:'Peshonadagi mayda toshmalar',place:'Peshona',code:'ACNE',summary:'Namuna ko‘rinishda mayda tarqoq belgilar tasvirlangan. Akne guruhi faqat interfeys ssenariysi sifatida berilgan.',observation:'Belgilar atrofidagi rang farqi illustratsiya orqali ko‘rsatilgan.',note:'Ertalab bir xil yoritishda surat olish eslatmasi.',itching:'NO'},
  {key:'aziz-foot',owner:'aziz',title:'Oyoqdagi halqasimon dog‘',place:'Chap boldir',code:'FUNGAL_INFECTION',summary:'Namuna illustratsiyada halqasimon kontur mavjud. Zamburug‘li infeksiya guruhi demo uchun tanlangan, model xulosasi emas.',observation:'Markaz va chekka qism ko‘rinishi ataylab farqlantirilgan.',note:'Dermatologga ko‘rsatish uchun savollar tayyorlash haqidagi demo yozuv.',itching:'YES'},
  {key:'madina-elbow',owner:'madina',title:'Tirsakdagi quruq soha',place:'Chap tirsak',code:'PSORIASIS',summary:'Namuna ssenariy qipiqlanishga o‘xshash ko‘rinishni kuzatish oqimini ko‘rsatadi. Psoriaz tashxisi qo‘yilmagan.',observation:'Quruq sohani qayta kuzatish uchun alohida joy yaratilgan.',note:'Quruqlik qachondan beri kuzatilganini qayd etish uchun namuna.',itching:'YES'},
  {key:'madina-shoulder',owner:'madina',title:'Yelkadagi pigmentli belgi',place:'O‘ng yelka',code:'SUSPICIOUS_PIGMENTED',summary:'Namuna ssenariy pigmentli belgi haqida yozuv va keyingi ko‘rikni rejalashtirishni ko‘rsatadi. Xavf darajasi hisoblanmagan.',observation:'O‘zgarish haqidagi demo javob mavjud.',note:'Bu faqat namuna: o‘zgarish haqidagi savolga Ha deb belgilangan.',itching:'NO'},
  {key:'admin-arm',owner:'admin',title:'Ko‘rgazma: bilak kuzatuvi',place:'Bilak',code:'NEVUS',summary:'Administratorning o‘z demo kuzatuvi. Boshqa hisoblar ma’lumotlariga kirish huquqi berilmaydi.',observation:'Hisobot va private surat oqimini ko‘rsatuvchi illustratsiya.',note:'Texnik ko‘rgazma uchun yaratilgan namuna.',itching:'NO'},
  {key:'admin-face',owner:'admin',title:'Ko‘rgazma: yangi kuzatuv',place:'Yuz',code:'ACNE',summary:'Yangi kuzatuv qoralamasi uchun namuna.',observation:'Davom ettirish mumkin bo‘lgan qoralama.',note:'Rozilik va surat yuklash bosqichlarini ko‘rsatish uchun.',itching:'UNKNOWN'},
];
type Status='FINISHED'|'DRAFT'|'FAILED'|'CANCELLED';
const samples:{key:string;place:string;days:number;status:Status;image:number}[]=[
  {key:'a01',place:'aziz-mole',days:35,status:'FINISHED',image:1},{key:'a02',place:'aziz-mole',days:4,status:'FINISHED',image:2},
  {key:'a03',place:'aziz-mole',days:0,status:'DRAFT',image:2},{key:'a04',place:'aziz-mole',days:1,status:'CANCELLED',image:1},
  {key:'a05',place:'aziz-hand',days:20,status:'FINISHED',image:3},{key:'a06',place:'aziz-hand',days:8,status:'FINISHED',image:4},
  {key:'a07',place:'aziz-hand',days:2,status:'FAILED',image:7},{key:'a08',place:'aziz-face',days:14,status:'FINISHED',image:5},
  {key:'a09',place:'aziz-face',days:1,status:'DRAFT',image:5},{key:'a10',place:'aziz-face',days:6,status:'CANCELLED',image:5},
  {key:'a11',place:'aziz-foot',days:9,status:'FINISHED',image:6},{key:'a12',place:'aziz-foot',days:3,status:'FAILED',image:6},
  {key:'m01',place:'madina-elbow',days:17,status:'FINISHED',image:3},{key:'m02',place:'madina-shoulder',days:5,status:'FINISHED',image:8},
  {key:'m03',place:'madina-shoulder',days:0,status:'DRAFT',image:8},{key:'s01',place:'admin-arm',days:11,status:'FINISHED',image:1},
  {key:'s02',place:'admin-face',days:0,status:'DRAFT',image:5},
];

async function main(){
  if(process.env.NODE_ENV==='production')throw new SeedError('Demo seed is development-only.');
  const url=new URL(process.env.DATABASE_URL||'postgresql://invalid');
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new SeedError('Demo seed requires a loopback PostgreSQL database.');
  const db=new PrismaClient(),storage=new StorageService();const writtenKeys:string[]=[];
  const anchor=Date.now()-3600000;const ago=(days:number,minutes=0)=>new Date(anchor-days*86400000-minutes*60000);
  try{
    await db.$connect();await storage.ready();
    for(const user of users){
      const existing=await db.user.findFirst({where:{OR:[{id:id(user.key)},{email:user.email}]}});
      if(existing&&(existing.id!==id(user.key)||existing.email!==user.email||!existing.isDemo||existing.deletedAt))throw new SeedError(`Demo account collision or deletion pending: ${user.email}. Existing account was not modified.`);
    }
    const assets=new Map<number,{bytes:Buffer;width:number;height:number;hash:string;quality:Prisma.InputJsonValue|typeof Prisma.DbNull}>();
    let qualityAvailable=false;
    try{qualityAvailable=(await fetch(config.mlUrl+'/health/live',{signal:AbortSignal.timeout(2000)})).ok;}catch{/* Offline seeds never invent measurements. */}
    for(let number=1;number<=8;number++){
      const bytes=await readFile(resolve(projectRoot(),`apps/api/prisma/demo-assets/image${number}.jpg`));
      const metadata=await sharp(bytes).metadata();
      if(!metadata.width||!metadata.height||metadata.format!=='jpeg')throw new SeedError('Invalid demo illustration. Run pnpm demo:assets.');
      let quality:Prisma.InputJsonValue|typeof Prisma.DbNull=Prisma.DbNull;
      if(qualityAvailable)try{quality=await new MlService().quality(bytes) as unknown as Prisma.InputJsonValue;}catch{qualityAvailable=false;}
      assets.set(number,{bytes,width:metadata.width,height:metadata.height,hash:createHash('sha256').update(bytes).digest('hex'),quality});
    }
    const hashes=new Map(await Promise.all(users.map(async user=>[user.key,await argon2.hash(user.password,{type:argon2.argon2id})] as const)));
    await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734207,230926)`;
      for(const user of users)await tx.user.upsert({where:{id:id(user.key)},create:{id:id(user.key),email:user.email,name:user.name,role:user.role,isDemo:true,passwordHash:hashes.get(user.key)!,createdAt:ago(70)},update:{passwordHash:hashes.get(user.key)!}});
      for(const place of cases){
        const existing=await tx.case.findUnique({where:{id:id(place.key)}});
        if(existing&&(existing.userId!==id(place.owner)||existing.deletedAt))throw new SeedError('Demo case collision or deletion pending. No data was overwritten.');
        if(!existing)await tx.case.create({data:{id:id(place.key),userId:id(place.owner),title:place.title,bodyLocation:place.place,retained:true,createdAt:ago(60),updatedAt:ago(0)}});
      }
      for(const [index,sample] of samples.entries()){
        const place=cases.find(item=>item.key===sample.place)!;
        const analysisId=id(sample.key),imageId=id(sample.key+':image'),createdAt=ago(sample.days,index*7);
        const existing=await tx.analysis.findUnique({where:{id:analysisId}});
        if(existing){if(!existing.isDemo||existing.userId!==id(place.owner)||existing.caseId!==id(place.key)||existing.deletedAt)throw new SeedError('Demo analysis collision or deletion pending. No data was overwritten.');continue;}
        const asset=assets.get(sample.image)!;
        const storageKey=storage.key('jpg');await storage.put(storageKey,asset.bytes,'image/jpeg');writtenKeys.push(storageKey);
        const symptoms={duration:sample.place.includes('mole')?'YEARS':'WEEKS',itching:place.itching,pain:'NO',bleeding:'NO',changing:sample.place==='madina-shoulder'?'YES':'UNKNOWN',asymmetry:'UNKNOWN',border:'UNKNOWN',color:'UNKNOWN',diameterMm:null,notes:`DEMO kundaligi. ${place.note}`,questionnaireVersion:'1.0'};
        const result=sample.status==='FINISHED'?{
          isDemo:true,provider:'demo',dataSource:'DEMO_SEED',modelVersion:'DEMO-SCENARIO-v1',pipelineVersion:'demo-fixture-v1',outcome:'UNCERTAIN',
          predictions:[{classCode:place.code,score:null,scoreType:'NOT_CALIBRATED'}],riskLevel:'NOT_ASSESSED',malignantProbability:null,calibrationStatus:'NOT_AVAILABLE',
          summary:place.summary,observations:[place.observation,'Bu matn DEMO uchun oldindan tayyorlangan; surat AI xizmatiga yuborilmagan.'],
          uncertaintyReasons:['Demo ma’lumot: klinik baholash va model inference bajarilmagan.'],
          recommendation:'Namuna: kuzatuvlar tarixini saqlash va kerak bo‘lsa dermatolog ko‘rigida ko‘rsatish uchun hisobotni yuklab olish mumkin.',
          limitations:['Sintetik illustratsiya va xayoliy simptomlar. Haqiqiy tibbiy xulosa emas.','Model ehtimoli, xavf va segmentatsiya hisoblanmagan.'],
          primaryImageId:imageId,aggregationMethod:'DEMO_ONLY',imageResults:[{imageId,inferencePerformed:false,reason:'DEMO_SYNTHETIC_FIXTURE'}],
        }:Prisma.DbNull;
        await tx.analysis.create({data:{id:analysisId,userId:id(place.owner),caseId:id(place.key),status:sample.status,isDemo:true,
          processingConsent:true,historyConsent:true,researchConsent:false,externalAiConsent:false,consentVersion:'1.0',consentedAt:createdAt,expiresAt:null,
          symptoms,result,riskLevel:'NOT_ASSESSED',captureNotes:'DEMO_SEED_V1: synthetic illustration; no patient data.',primaryImageId:imageId,
          errorCode:sample.status==='FAILED'?'ML_TIMEOUT':null,errorMessage:sample.status==='FAILED'?'DEMO: texnik uzilish ssenariysi. Haqiqiy AI so‘rovi yuborilmagan.':null,
          createdAt,updatedAt:createdAt,submittedAt:sample.status==='DRAFT'?null:new Date(createdAt.getTime()+60000),completedAt:sample.status==='DRAFT'?null:new Date(createdAt.getTime()+120000),
          images:{create:{id:imageId,storageKey,mimeType:'image/jpeg',byteSize:asset.bytes.length,width:asset.width,height:asset.height,sha256:asset.hash,
            transform:{originalOrientation:1,normalizedWidth:asset.width,normalizedHeight:asset.height,modelCoordinateSpace:'normalized_0_1',dataSource:'DEMO_ILLUSTRATION'},
            quality:asset.quality,roi:{x:0.3,y:0.23,width:0.4,height:0.44},createdAt}},
          consentEvents:{create:{id:id(sample.key+':consent'),processing:true,history:true,research:false,externalAi:false,version:'1.0',createdAt}},
        }});
      }
      const email=process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.SEED_ADMIN_PASSWORD;
      if(email&&password&&password.length>=12&&!users.some(user=>user.email===email))await tx.user.upsert({where:{email},create:{email,name:'Administrator',role:'ADMIN',passwordHash:await argon2.hash(password),isDemo:false},update:{}});
    },{timeout:120000,maxWait:10000});
    console.log(JSON.stringify({message:'Demo seed ready. Existing fixture edits and normal accounts preserved.',users:users.length,cases:cases.length,analyses:samples.length,newImages:writtenKeys.length,accounts:users.map(({email,role})=>({email,role})),externalAiCalls:0}));
  }catch(error){for(const key of writtenKeys)await storage.remove(key).catch(()=>undefined);throw error;}
  finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error instanceof SeedError?error.message:`Demo seed failed (${error?.code||error?.name||'unknown'}). Check database/migrations and demo assets.`);process.exitCode=1;});
