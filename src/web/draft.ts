import {validateConfig,type DesignConfig,type Theme} from '../shared/design.js';

export interface Draft {version:1;project:string;updatedAt:number;config:DesignConfig;theme:Theme;}
export const draftKey=(project:string)=>`design-studio:draft:${project}`;
export function readDraft(storage:Pick<Storage,'getItem'>,project:string):Draft|null {
  const text=storage.getItem(draftKey(project));if(text===null)return null;
  if(text.length>1_000_000)throw new Error('Draft exceeds the 1 MB limit.');
  const draft=JSON.parse(text);
  if(!draft||draft.version!==1||draft.project!==project||!Number.isFinite(draft.updatedAt)||draft.updatedAt<=0||!Number.isFinite(new Date(draft.updatedAt).getTime())||!['light','dark'].includes(draft.theme))throw new Error('Invalid draft metadata.');
  return {...draft,config:validateConfig(draft.config)};
}
export function writeDraft(storage:Pick<Storage,'setItem'>,project:string,config:DesignConfig,theme:Theme):void {
  const draft:Draft={version:1,project,updatedAt:Date.now(),config:validateConfig(config),theme},text=JSON.stringify(draft);
  if(text.length>1_000_000)throw new Error('Draft exceeds the 1 MB limit.');
  storage.setItem(draftKey(project),text);
}
