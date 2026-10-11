// Stored ZIP entries keep skill export dependency-free and readable by standard tools.
export function zipFiles(files:Record<string,string|Uint8Array>): Uint8Array {
  const encoder=new TextEncoder(), chunks:Uint8Array[]=[], entries:{name:Uint8Array;size:number;crc:number;offset:number}[]=[];
  let offset=0;
  const header=(size:number)=>{const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};};
  for(const [filename,content] of Object.entries(files)) {
    if(!/^[a-zA-Z0-9._/-]+$/.test(filename)||filename.split('/').includes('..')||filename.startsWith('/')) throw new Error('Unsafe ZIP filename.');
    const name=encoder.encode(filename), data=typeof content==='string'?encoder.encode(content):content;let crc=0xFFFFFFFF;
    for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}
    crc=(crc^0xFFFFFFFF)>>>0;
    const {bytes,view}=header(30);view.setUint32(0,0x04034B50,true);view.setUint16(4,20,true);view.setUint16(10,0,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);
    chunks.push(bytes,name,data);entries.push({name,size:data.length,crc,offset});offset+=30+name.length+data.length;
  }
  const centralStart=offset;
  for(const e of entries){const {bytes,view}=header(46);view.setUint32(0,0x02014B50,true);view.setUint16(4,20,true);view.setUint16(6,20,true);view.setUint16(14,33,true);view.setUint32(16,e.crc,true);view.setUint32(20,e.size,true);view.setUint32(24,e.size,true);view.setUint16(28,e.name.length,true);view.setUint32(42,e.offset,true);chunks.push(bytes,e.name);offset+=46+e.name.length;}
  const {bytes,view}=header(22);view.setUint32(0,0x06054B50,true);view.setUint16(8,entries.length,true);view.setUint16(10,entries.length,true);view.setUint32(12,offset-centralStart,true);view.setUint32(16,centralStart,true);chunks.push(bytes);offset+=22;
  const output=new Uint8Array(offset);let at=0;for(const chunk of chunks){output.set(chunk,at);at+=chunk.length;}return output;
}
