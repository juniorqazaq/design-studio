import {basename,dirname,resolve} from 'node:path';
export function editorPaths(entry:string,paths={basename,dirname,resolve}){
 const toolRoot=paths.resolve(paths.dirname(entry),'../..'),compiled=paths.basename(paths.dirname(paths.dirname(entry)))==='dist-cli';
 return {toolRoot,root:compiled?paths.resolve(toolRoot,'dist'):toolRoot,compiled};
}
