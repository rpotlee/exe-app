import { describe, expect, it, vi } from 'vitest';
import { AssistReview, type AssistClient, type ReviewEntry } from './assistReview';
import { buildRequest, extractText } from '../../supabase/functions/_shared/ai.ts';
import { withAiProvider } from '../../supabase/functions/_shared/ai-runtime.ts';
import { parseEnvelope, SYSTEM as ASSISTANT_SYSTEM } from '../../supabase/functions/_shared/assistant.ts';
import type { Assist } from './ai';

describe('proactive AI workload with a mock provider', () => {
  it('handles 20 interactive assistance requests with bounded output and records usage', async () => {
    const releases:Record<string,unknown>[]=[];
    const admin={rpc:vi.fn(async(name:string,args:Record<string,unknown>)=>name==='exe_ai_acquire'?{data:{granted:true},error:null}:(releases.push(args),{data:true,error:null}))};
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({usage:{total_tokens:75},choices:[{message:{content:JSON.stringify({mode:'answer',summary:'Answered directly.',artifact:{type:'answer',body:'The next step is to ask the venue for its entrance details.',channel:null,subject:'',items:[],sources:[]},question:null,actions:[]})}}]})));
    const started=performance.now();let useful=0;
    for(let i=0;i<20;i++){
      const prompt=`What should I do about venue access? Request ${i}`;
      const result=await withAiProvider(admin,'owner',buildRequest('openai','test-only','FAKE_TEST_KEY',ASSISTANT_SYSTEM,prompt,300),ASSISTANT_SYSTEM,prompt,300,data=>parseEnvelope(extractText('openai',data)),fetcher);
      if(result?.artifact?.type==='answer'&&result.artifact.body.includes('entrance details')) useful++;
    }
    const elapsedMs=Math.round(performance.now()-started), tokens=releases.reduce((n,r)=>n+Number(r.p_used),0);
    expect(fetcher).toHaveBeenCalledTimes(20);expect(useful).toBe(20);expect(tokens).toBe(1500);
    expect(releases.every(r=>r.p_class===undefined&&r.p_status==='ok'&&Number(r.p_latency_ms)>=0)).toBe(true);
    console.info(`Mock interactive assistance: 20 requests, ${tokens} reported tokens, $${(tokens*2/1_000_000).toFixed(6)} estimated at $2/M tokens, ${elapsedMs} ms total, ${useful} usable answers.`);
  });
  it('imports 300 mixed entries, makes 50 changes, then handles exactly 20 explicit batches', async () => {
    const all: ReviewEntry[] = Array.from({length:300},(_,i)=>({id:`c${i}`,kind:i%3===0?'todo':i%3===1?'note':'reminder',text:`Prepare event item ${i}`,revision:1}));
    const eligible=()=>all.filter(e=>e.kind==='todo');
    const settings={enabled:true,disclosure_accepted_at:'2026-11-10',provider:'openai',model:'test-only'};
    const store=new Map<string,string>(), storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
    const calls={provider:0,admission:0,releases:[] as Record<string,unknown>[]};
    const admin={rpc:vi.fn(async (name:string,args:Record<string,unknown>)=>{
      if(name==='exe_ai_acquire'){calls.admission++;return {data:{granted:true},error:null};}
      calls.releases.push(args);return {data:true,error:null};
    })};
    const fetcher=vi.fn(async ()=>{calls.provider++;return new Response(JSON.stringify({usage:{input_tokens:60,output_tokens:30}}));});
    const assist=vi.fn(async (ids:string[]):Promise<Assist>=>withAiProvider(admin,'owner',buildRequest('openai','test-only','FAKE_TEST_KEY','system',ids.join(','),100),'system',ids.join(','),100,()=>({items:[],priorities:ids.map(captureId=>({captureId,level:'medium' as const,why:'Needs action'})),groups:[{name:`Event ${ids[0]}`,ids:ids.slice(0,2),why:'Same event'}],dependencies:[{before:ids[0]!,after:ids[1]!,why:'Needs details first'}]}),fetcher));
    const client:AssistClient={settings:async()=>settings,assist};
    const review=new AssistReview(client,storage);review.configure('owner',settings);review.update(eligible());
    for(let i=0;i<50;i++){all[i]!.text+=` changed ${i}`;all[i]!.revision=2;review.update(eligible());}
    expect(review.view().pendingCount).toBe(100);
    expect(calls.provider).toBe(0);
    const started=performance.now();
    for(let i=0;i<20;i++) await review.run();
    const elapsedMs=Math.round(performance.now()-started);
    expect(calls.provider).toBe(20);expect(calls.admission).toBe(20);
    expect(review.view().pendingCount).toBe(20);
    expect(review.view().groups).toHaveLength(20);
    expect(review.view().deps).toHaveLength(20);
    expect(Object.keys(review.view().prios)).toHaveLength(80);
    const used=calls.releases.reduce((n,r)=>n+Number(r.p_used),0);
    expect(used).toBe(1800);
    const second=new AssistReview(client,storage);second.configure('different-owner',settings);second.update(eligible());
    expect(second.view().pendingCount).toBe(100);
    console.info(`Mock AI workload: 300 imported (100 tasks, 100 notes, 100 reminders), 50 edits, 20 requests, ${used} reported tokens, $${(used*2/1_000_000).toFixed(6)} estimated at $2/M tokens, ${elapsedMs} ms total, 20 groups and 20 dependencies suggested.`);
  });
});
