import { createWorker } from 'tesseract.js';
import workerPath from 'tesseract.js/dist/worker.min.js?url';
export async function prepareReceiptImage(file) {
 if(file.size>15*1024*1024) throw new Error('사진은 15MB 이하로 선택해주세요.');
 const url=URL.createObjectURL(file);
 try {
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,2200/image.width,5500/image.height,Math.sqrt(7000000/(image.width*image.height)));
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas;
 }catch {throw new Error('사진을 열 수 없어요. JPG·PNG 사진으로 다시 선택해주세요.');}
 finally{URL.revokeObjectURL(url);}
}
export async function recognizeReceipt(file,onProgress,signal) {
 const image=await prepareReceiptImage(file);
 if(signal.aborted) throw new DOMException('취소했어요.','AbortError');
 let worker;
 try {
  worker=await createWorker('kor+eng',1,{workerPath,corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',logger:message=>onProgress(message)});
  if(signal.aborted) throw new DOMException('취소했어요.','AbortError');
  const stop=()=>worker.terminate();signal.addEventListener('abort',stop,{once:true});
  try {await worker.setParameters({preserve_interword_spaces:'1'});const {data}=await worker.recognize(image);return data.text;}
  finally {signal.removeEventListener('abort',stop);}
 }finally {if(worker) await worker.terminate();}
}
