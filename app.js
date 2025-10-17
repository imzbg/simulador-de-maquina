// Simulador generico
// Registradores: R1..Rn, Memoria: M0..M(m-1), Entradas/saidas: filas.
// Permite configurar operacoes e testes por registrador.

(function(){
  // Util
  const $ = id => document.getElementById(id);

  // Default machine model
  let machine = {
    memCount: 8,
    inCount: 4,
    outCount: 4,
    regCount: 5,
    regNames: [],
    regInputFunc: {},
    regOutputFunc: {},
    regOpsAllowed: {},
    regTestsAllowed: {},
    opsCatalog: ['INC','DEC','ADD','SUB','MOV','LOAD','STORE','IN','OUT'],
    testsCatalog: ['=0','>0','<0'],
    regs: [], mem: [], inputs: [], outputs: [], program: [], labels: {}, ip:0, running:false, timer:null, trace:[]
  };

  function toSet(value, defaults){
    if(value instanceof Set) return value;
    if(Array.isArray(value)) return new Set(value);
    if(value && typeof value === 'object') return new Set(Object.values(value));
    return new Set(defaults);
  }

  function init(){
    $('apply-machine').addEventListener('click', applyMachine);
    $('export-machine').addEventListener('click', renderMachineText);
    $('save-machine').addEventListener('click', saveMachineLocal);
    $('load-machine').addEventListener('click', loadMachineLocal);
    $('validate-program').addEventListener('click', validateProgram);
    $('save-program').addEventListener('click', saveProgramLocal);
    $('export-program').addEventListener('click', exportProgramText);
    $('load-program').addEventListener('click', loadProgramLocal);
    $('reset').addEventListener('click', resetExecution);
    $('step').addEventListener('click', stepExecution);
    $('run').addEventListener('click', startRun);
    $('stop').addEventListener('click', stopRun);
    $('export-log').addEventListener('click', exportLog);
    $('apply-machine').click();
  }

  function applyMachine(){
    machine.memCount = Number($('mem-count').value);
    machine.inCount = Number($('in-count').value);
    machine.outCount = Number($('out-count').value);
    machine.regCount = Number($('reg-count').value);
    machine.regNames = [];
    for(let i=1;i<=machine.regCount;i++) machine.regNames.push('R'+i);

    machine.regInputConst = machine.regInputConst || {};
    machine.regOutMem = machine.regOutMem || {};

    // ensure default per-register configs exist
    for(let r of machine.regNames){
      machine.regInputFunc[r] = machine.regInputFunc[r] || 'queue'; // default read from queue
      machine.regOutputFunc[r] = machine.regOutputFunc[r] || 'none';
      machine.regOpsAllowed[r] = toSet(machine.regOpsAllowed[r], machine.opsCatalog);
      machine.regTestsAllowed[r] = toSet(machine.regTestsAllowed[r], machine.testsCatalog);
    }

    // initialize runtime state
    machine.regs = new Array(machine.regCount).fill(0);
    machine.mem = new Array(machine.memCount).fill(0);
    machine.inputs = new Array(machine.inCount).fill(0);
    machine.outputs = [];
    machine.program = [];
    machine.labels = {};
    machine.ip = 0;
    machine.trace = [];
    machine.running=false;
    stopRun();

    renderRegConfig();
    renderIOInputs();
    renderState();
    renderMachineText();
  }

  // Render per-register configuration UI
  function renderRegConfig(){
    const area = $('reg-list'); area.innerHTML='';
    for(let i=0;i<machine.regCount;i++){
      const r = machine.regNames[i];
      const div = document.createElement('div'); div.className='reg-config';
      const opsAllowed = toSet(machine.regOpsAllowed[r], machine.opsCatalog);
      machine.regOpsAllowed[r] = opsAllowed;
      const testsAllowed = toSet(machine.regTestsAllowed[r], machine.testsCatalog);
      machine.regTestsAllowed[r] = testsAllowed;
      div.innerHTML = `<strong>${r}</strong>
        <label>Funcao de entrada:
          <select data-reg="${r}" class="reg-in-func">
            <option value="none">nenhuma</option>
            <option value="queue">ler da fila de entradas</option>
            <option value="const">valor constante</option>
          </select>
          <input type="number" class="reg-in-const" placeholder="const (se const)" style="display:none">
        </label>
        <label>Funcao de saida:
          <select data-reg="${r}" class="reg-out-func">
            <option value="none">nenhuma</option>
            <option value="push">empurrar para fila de saidas</option>
            <option value="mem">escrever em memoria (especificar indice)</option>
          </select>
          <input type="number" class="reg-out-mem" placeholder="M index (se mem)" style="display:none">
        </label>
        <label>Operacoes permitidas (min.4):</label>
        <div class="ops-checkboxes"></div>
        <label>Testes permitidos (min.3):</label>
        <div class="tests-checkboxes"></div>
      `;
      area.appendChild(div);

      // populate selects and checkboxes with current values
      const inSel = div.querySelector('.reg-in-func');
      const outSel = div.querySelector('.reg-out-func');
      const inConst = div.querySelector('.reg-in-const');
      const outMem = div.querySelector('.reg-out-mem');

      inSel.value = machine.regInputFunc[r] || 'queue';
      outSel.value = machine.regOutputFunc[r] || 'none';
      if(inSel.value==='const') inConst.style.display='inline-block';
      if(outSel.value==='mem') outMem.style.display='inline-block';
      inSel.addEventListener('change', (e)=>{ machine.regInputFunc[r]=e.target.value; inConst.style.display = e.target.value==='const' ? 'inline-block' : 'none'; });
      outSel.addEventListener('change', (e)=>{ machine.regOutputFunc[r]=e.target.value; outMem.style.display = e.target.value==='mem' ? 'inline-block' : 'none'; });

      inConst.addEventListener('input', (e)=>{ machine.regInputConst = machine.regInputConst || {}; machine.regInputConst[r] = Number(e.target.value||0); });
      outMem.addEventListener('input', (e)=>{ machine.regOutMem = machine.regOutMem || {}; machine.regOutMem[r] = Number(e.target.value||0); });

      // ops checkboxes
      const opsArea = div.querySelector('.ops-checkboxes');
      opsArea.innerHTML='';
      for(let op of machine.opsCatalog){
        const cb = document.createElement('label');
        cb.style.marginRight='6px';
        const checked = opsAllowed.has(op) ? 'checked' : '';
        cb.innerHTML = `<input type="checkbox" data-op="${op}" ${checked}> ${op}`;
        opsArea.appendChild(cb);
        cb.querySelector('input').addEventListener('change', (e)=>{
          if(e.target.checked) opsAllowed.add(op); else opsAllowed.delete(op);
        });
      }
      // tests checkboxes
      const testsArea = div.querySelector('.tests-checkboxes');
      testsArea.innerHTML='';
      for(let t of machine.testsCatalog){
        const cb = document.createElement('label');
        cb.style.marginRight='6px';
        const checked = testsAllowed.has(t) ? 'checked' : '';
        cb.innerHTML = `<input type="checkbox" data-test="${t}" ${checked}> ${t}`;
        testsArea.appendChild(cb);
        cb.querySelector('input').addEventListener('change', (e)=>{
          if(e.target.checked) testsAllowed.add(t); else testsAllowed.delete(t);
        });
      }
    }
  }

  function renderIOInputs(){
    const area = $('inputs-area'); area.innerHTML='';
    for(let i=0;i<machine.inCount;i++){
      const div = document.createElement('div'); div.className='state-cell';
      div.innerHTML = `In[${i}]: <input data-in="${i}" type="number" value="0">`;
      area.appendChild(div);
    }
    const outs = $('outputs-area'); outs.innerHTML='';
    for(let i=0;i<machine.outCount;i++){ const d=document.createElement('div'); d.className='state-cell'; d.id='out-'+i; d.textContent='Out['+i+']: '; outs.appendChild(d); }
  }

  function renderState(){
    const regsArea = $('regs-area'); regsArea.innerHTML='';
    for(let i=0;i<machine.regCount;i++){
      const cell = document.createElement('div'); cell.className='state-cell'; cell.id='reg-'+i;
      cell.innerHTML = `<strong>${machine.regNames[i]}</strong><div>${machine.regs[i]}</div>`;
      regsArea.appendChild(cell);
    }
    const memArea = $('mem-area'); memArea.innerHTML='';
    for(let i=0;i<machine.memCount;i++){
      const cell = document.createElement('div'); cell.className='state-cell'; cell.id='mem-'+i;
      cell.innerHTML = `M[${i}]<div>${machine.mem[i]}</div>`;
      memArea.appendChild(cell);
    }
    $('trace').textContent = machine.trace.join('\\n');
    // outputs
    for(let i=0;i<machine.outCount;i++){
      const el = $('out-'+i);
      if(el) el.textContent = 'Out['+i+']: ' + (machine.outputs[i]!==undefined ? machine.outputs[i] : '');
    }
  }

  function renderMachineText(){
    const s = [];
    s.push('Maquina = (M, I, O, R, F_in, F_out, Op, Testes)');
    s.push('M (memorias): ' + machine.memCount);
    s.push('I (tamanho da fila de entrada): ' + machine.inCount);
    s.push('O (tamanho da fila de saida): ' + machine.outCount);
    s.push('R (registradores): ' + machine.regCount + ' -> ' + machine.regNames.join(', '));
    s.push('Funcoes de entrada por registrador:');
    for(let r of machine.regNames) s.push('  ' + r + ': ' + (machine.regInputFunc[r] || 'none') + (machine.regInputConst && machine.regInputConst[r]!==undefined ? (' (const='+machine.regInputConst[r]+')') : ''));
    s.push('Funcoes de saida por registrador:');
    for(let r of machine.regNames) s.push('  ' + r + ': ' + (machine.regOutputFunc[r] || 'none') + (machine.regOutMem && machine.regOutMem[r]!==undefined ? (' (M='+machine.regOutMem[r]+')') : ''));
    s.push('Operadores permitidos por registrador:');
    for(let r of machine.regNames) s.push('  ' + r + ': ' + Array.from(machine.regOpsAllowed[r]).join(', '));
    s.push('Testes permitidos por registrador:');
    for(let r of machine.regNames) s.push('  ' + r + ': ' + Array.from(machine.regTestsAllowed[r]).join(', '));
    $('machine-text').textContent = s.join('\\n');
    return s.join('\\n');
  }

  // Program parsing/validation
  function parseProgram(text){
    const lines = text.split('\\n').map(l=>l.trim()).filter(l=>l && !l.startsWith('//'));
    const prog = []; const labels = {};
    for(let i=0;i<lines.length;i++){
      let raw = lines[i];
      let label = null;
      if(raw.includes(':')){
        const parts = raw.split(':');
        label = parts.shift().trim();
        raw = parts.join(':').trim();
      }
      const parts = raw.split(/\s+/);
      const op = parts[0].toUpperCase();
      const args = parts.slice(1);
      prog.push({label, raw, op, args, lineNo: i+1});
      if(label) labels[label]=prog.length-1;
    }
    return {prog, labels};
  }

  function regAllowsOp(regName, op){
    const ops = machine.regOpsAllowed[regName];
    if(!ops) return false;
    if(ops instanceof Set) return ops.has(op);
    if(Array.isArray(ops)) return ops.includes(op);
    return false;
  }

  function regAllowsTest(regName, test){
    const tests = machine.regTestsAllowed[regName];
    if(!tests) return false;
    if(tests instanceof Set) return tests.has(test);
    if(Array.isArray(tests)) return tests.includes(test);
    return false;
  }

  function validateProgram(){
    const text = $('program-code').value;
    const {prog, labels} = parseProgram(text);
    let ok = true; const errors = [];
    const ops = new Set(['IN','OUT','MOV','LOAD','STORE','INC','DEC','ADD','SUB','JUMP','JZ','JNZ','HALT']);
    for(let i=0;i<prog.length;i++){
      const ins = prog[i];
      if(!ops.has(ins.op)){ errors.push(`Linha ${ins.lineNo}: op desconhecida "${ins.op}"`); ok=false; continue; }
      // arg checks
      if(ins.op==='IN' || ins.op==='OUT' || ins.op==='INC' || ins.op==='DEC' || ins.op==='HALT'){
        if(ins.op!=='HALT' && ins.args.length!==1){ errors.push(`Linha ${ins.lineNo}: ${ins.op} precisa 1 argumento`); ok=false; }
      }
      if(ins.op==='MOV' || ins.op==='ADD' || ins.op==='SUB'){
        if(ins.args.length!==2){ errors.push(`Linha ${ins.lineNo}: ${ins.op} precisa 2 argumentos`); ok=false; }
      }
      if(ins.op==='LOAD' || ins.op==='STORE'){
        if(ins.args.length!==2){ errors.push(`Linha ${ins.lineNo}: ${ins.op} precisa 2 argumentos`); ok=false; }
      }
      if((ins.op==='JUMP' && ins.args.length!==1) || ((ins.op==='JZ' || ins.op==='JNZ') && ins.args.length!==2)){
        errors.push(`Linha ${ins.lineNo}: args incorretos para ${ins.op}`); ok=false;
      }
      if(ins.op==='JUMP'){
        const lbl = ins.args[0];
        if(lbl && !labels.hasOwnProperty(lbl)){ errors.push(`Linha ${ins.lineNo}: label '${lbl}' nao definida`); ok=false; }
      }
      // check registers used are within configured range and allowed ops/tests
      const regTok = token => {
        if(!regTok) return null;
        regTok = regTok.toUpperCase();
        if(regTok.startsWith('R')){
          const idx = Number(regTok.slice(1));
          if(Number.isNaN(idx) || idx<1 || idx>machine.regCount) return null;
          return 'R'+idx;
        }
        return null;
      };
      // check op permission on registers used
      if(['IN','OUT','INC','DEC'].includes(ins.op)){
        const r = regTok(ins.args[0]);
        if(!r){ errors.push(`Linha ${ins.lineNo}: registrador invalido ${ins.args[0]}`); ok=false; }
        else if(!regAllowsOp(r, ins.op)){ errors.push(`Linha ${ins.lineNo}: operacao ${ins.op} nao permitida no ${r}`); ok=false; }
      }
      if(['MOV','ADD','SUB'].includes(ins.op)){
        const rsrc = regTok(ins.args[0]);
        const rdst = regTok(ins.args[1]);
        if(!rsrc || !rdst){ errors.push(`Linha ${ins.lineNo}: registrador invalido em ${ins.raw}`); ok=false; }
        else if(!regAllowsOp(rdst, ins.op)){ errors.push(`Linha ${ins.lineNo}: operacao ${ins.op} nao permitida no destino ${rdst}`); ok=false; }
      }
      if(ins.op==='LOAD'){
        // args: Mx Rn
        const mem = ins.args[0].toUpperCase();
        const m = mem.startsWith('M') ? Number(mem.slice(1)) : NaN;
        const r = regTok(ins.args[1]);
        if(Number.isNaN(m) || m<0 || m>=machine.memCount){ errors.push(`Linha ${ins.lineNo}: indice de memoria invalido ${ins.args[0]}`); ok=false; }
        if(!r){ errors.push(`Linha ${ins.lineNo}: registrador invalido ${ins.args[1]}`); ok=false; }
        else if(!regAllowsOp(r, 'LOAD')){ errors.push(`Linha ${ins.lineNo}: operacao LOAD nao permitida no ${r}`); ok=false; }
      }
      if(ins.op==='STORE'){
        const r = regTok(ins.args[0]); const mem = ins.args[1].toUpperCase(); const m = mem.startsWith('M') ? Number(mem.slice(1)) : NaN;
        if(!r){ errors.push(`Linha ${ins.lineNo}: registrador invalido ${ins.args[0]}`); ok=false; }
        else if(!regAllowsOp(r, 'STORE')){ errors.push(`Linha ${ins.lineNo}: operacao STORE nao permitida no ${r}`); ok=false; }
        if(Number.isNaN(m) || m<0 || m>=machine.memCount){ errors.push(`Linha ${ins.lineNo}: indice de memoria invalido ${ins.args[1]}`); ok=false; }
      }
      if(ins.op==='JZ' || ins.op==='JNZ'){
        const r = regTok(ins.args[0]); const lbl = ins.args[1];
        if(!r){ errors.push(`Linha ${ins.lineNo}: registrador invalido ${ins.args[0]}`); ok=false; }
        else {
          const needed = '=0';
          if(!regAllowsTest(r, needed)){ errors.push(`Linha ${ins.lineNo}: teste ${needed} nao permitido no ${r}`); ok=false; }
        }
        if(lbl && !labels.hasOwnProperty(lbl)){ errors.push(`Linha ${ins.lineNo}: label '${lbl}' nao definida`); ok=false; }
      }
    }
    const msg = ok ? 'Validacao OK. Programa compativel com a maquina.' : ('Erros:\n' + errors.join('\n'));
    $('program-validate').textContent = msg;
    if(ok){ const parsed = parseProgram(text); machine.program = parsed.prog; machine.labels = parsed.labels; }
    return ok;
  }

  // Program save/load local (localStorage)
  function saveMachineLocal(){ localStorage.setItem('sim_machine', JSON.stringify({
    memCount:machine.memCount, inCount:machine.inCount, outCount:machine.outCount, regCount:machine.regCount,
    regInputFunc:machine.regInputFunc, regOutputFunc:machine.regOutputFunc,
    regOpsAllowed: Object.fromEntries(Object.entries(machine.regOpsAllowed).map(([k,s])=>[k,Array.from(s)])),
    regTestsAllowed: Object.fromEntries(Object.entries(machine.regTestsAllowed).map(([k,s])=>[k,Array.from(s)]))
  })); alert('Maquina salva no armazenamento local do navegador.'); }

  function loadMachineLocal(){
    const s = localStorage.getItem('sim_machine'); if(!s){ alert('Nenhuma maquina salva localmente.'); return; }
    const obj = JSON.parse(s);
    machine.memCount = obj.memCount; machine.inCount = obj.inCount; machine.outCount = obj.outCount; machine.regCount = obj.regCount;
    machine.regInputFunc = obj.regInputFunc || machine.regInputFunc; machine.regOutputFunc = obj.regOutputFunc || machine.regOutputFunc;
    machine.regOpsAllowed = {}; machine.regTestsAllowed = {};
    for(let k in obj.regOpsAllowed) machine.regOpsAllowed[k]=new Set(obj.regOpsAllowed[k]);
    for(let k in obj.regTestsAllowed) machine.regTestsAllowed[k]=new Set(obj.regTestsAllowed[k]);
    $('mem-count').value = machine.memCount; $('in-count').value = machine.inCount; $('out-count').value = machine.outCount; $('reg-count').value = machine.regCount;
    applyMachine();
    alert('Maquina carregada do armazenamento local.');
  }

  function saveProgramLocal(){ localStorage.setItem('sim_program', $('program-code').value); alert('Programa salvo localmente.'); }
  function loadProgramLocal(){ const p = localStorage.getItem('sim_program'); if(p){ $('program-code').value = p; alert('Programa carregado.'); } else alert('Nenhum programa salvo localmente.'); }
  function exportProgramText(){ const txt = $('program-code').value; const blob = new Blob([txt], {type:'text/plain'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='program.txt'; a.click(); URL.revokeObjectURL(url); }
  function exportLog(){ const data = {machine:renderMachineText(), program:$('program-code').value, trace:machine.trace, regs:machine.regs, mem:machine.mem, outputs:machine.outputs}; const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='execution_log.json'; a.click(); URL.revokeObjectURL(url); }

  // Execution engine (step/continuous)
  function resetExecution(){
    // read input values
    machine.inputs = [];
    for(let i=0;i<machine.inCount;i++){
      const el = document.querySelector('[data-in="'+i+'"]');
      machine.inputs.push(Number(el ? el.value : 0) || 0);
    }
    machine.outputs = [];
    machine.regs = new Array(machine.regCount).fill(0);
    machine.mem = new Array(machine.memCount).fill(0);
    machine.ip = 0; machine.trace = []; machine.running=false; stopRun();
    renderState();
  }

  function stepExecution(){
    if(!machine.program || machine.program.length===0){
      if(!validateProgram()) return;
      resetExecution();
    }
    if(machine.ip<0 || machine.ip>=machine.program.length){ machine.trace.push('IP fora do alcance  HALT'); renderState(); return; }
    const ins = machine.program[machine.ip];
    machine.trace.push('[ip='+machine.ip+'] ' + (ins.label?ins.label+': ':'') + ins.raw);
    executeInstruction(ins);
    renderState();
  }

  function tokenReg(tok){
    if(!tok) return null; tok = tok.toUpperCase();
    if(tok.startsWith('R')){ const idx=Number(tok.slice(1)); if(!Number.isNaN(idx) && idx>=1 && idx<=machine.regCount) return 'R'+idx; }
    return null;
  }
  function tokenMem(tok){
    if(!tok) return null; tok = tok.toUpperCase();
    if(tok.startsWith('M')){ const idx=Number(tok.slice(1)); if(!Number.isNaN(idx) && idx>=0 && idx<machine.memCount) return Number(idx); }
    return null;
  }

  function executeInstruction(ins){
    const op = ins.op; const a = ins.args || [];
    function regIndexTok(t){ return tokenReg(t) ? Number(t.slice(1))-1 : null; }
    function memIndexTok(t){ return tokenMem(t); }

    if(op==='IN'){
      const ri = regIndexTok(a[0]);
      if(ri===null){ machine.ip++; return; }
      const rname = machine.regNames[ri];
      // only if reg input func allows queue
      if(machine.regInputFunc[rname]==='queue'){
        const val = machine.inputs.length>0 ? machine.inputs.shift() : 0;
        machine.regs[ri]=val;
      } else if(machine.regInputFunc[rname]==='const'){
        machine.regs[ri] = (machine.regInputConst && machine.regInputConst[rname]!==undefined) ? machine.regInputConst[rname] : 0;
      }
      machine.ip++;
    } else if(op==='OUT'){
      const ri = regIndexTok(a[0]);
      if(ri===null){ machine.ip++; return; }
      const rname = machine.regNames[ri];
      const val = machine.regs[ri] || 0;
      if(machine.regOutputFunc[rname]==='push'){
        machine.outputs.push(val);
      } else if(machine.regOutputFunc[rname]==='mem'){
        const mindex = (machine.regOutMem && machine.regOutMem[rname]!==undefined) ? machine.regOutMem[rname] : null;
        if(mindex!==null && mindex>=0 && mindex<machine.memCount) machine.mem[mindex]=val;
      }
      machine.ip++;
    } else if(op==='MOV'){
      const r1 = regIndexTok(a[0]), r2 = regIndexTok(a[1]);
      if(r1!==null && r2!==null) machine.regs[r2]=machine.regs[r1];
      machine.ip++;
    } else if(op==='LOAD'){
      const m = memIndexTok(a[0]), r = regIndexTok(a[1]);
      if(m!==null && r!==null) machine.regs[r]=machine.mem[m];
      machine.ip++;
    } else if(op==='STORE'){
      const r = regIndexTok(a[0]), m = memIndexTok(a[1]);
      if(m!==null && r!==null) machine.mem[m]=machine.regs[r];
      machine.ip++;
    } else if(op==='INC'){
      const r = regIndexTok(a[0]); if(r!==null) machine.regs[r]=Number(machine.regs[r]||0)+1; machine.ip++;
    } else if(op==='DEC'){
      const r = regIndexTok(a[0]); if(r!==null) machine.regs[r]=Number(machine.regs[r]||0)-1; machine.ip++;
    } else if(op==='ADD' || op==='SUB'){
      const r1=regIndexTok(a[0]), r2=regIndexTok(a[1]);
      if(r1!==null && r2!==null){
        if(op==='ADD') machine.regs[r2]=Number(machine.regs[r2]||0) + Number(machine.regs[r1]||0);
        else machine.regs[r2]=Number(machine.regs[r2]||0) - Number(machine.regs[r1]||0);
      }
      machine.ip++;
    } else if(op==='JUMP'){
      const lbl = a[0]; if(machine.labels.hasOwnProperty(lbl)) machine.ip = machine.labels[lbl]; else machine.ip++;
    } else if(op==='JZ' || op==='JNZ'){
      const r = regIndexTok(a[0]); const lbl = a[1]; const val = (r!==null? Number(machine.regs[r]||0):0);
      const cond = (op==='JZ' ? (val===0) : (val!==0));
      if(cond && machine.labels.hasOwnProperty(lbl)) machine.ip = machine.labels[lbl]; else machine.ip++;
    } else if(op==='HALT'){
      machine.trace.push('HALT'); machine.running=false; stopRun();
    } else {
      machine.ip++;
    }
  }

  function startRun(){
    if(machine.running) return;
    if(!validateProgram()) return;
    resetExecution();
    machine.running=true;
    const delay = Number($('run-delay').value) || 300;
    machine.timer = setInterval(()=>{
      if(!machine.running) return;
      if(machine.ip<0 || machine.ip>=machine.program.length){ machine.trace.push('IP out of range  stopping'); machine.running=false; stopRun(); renderState(); return; }
      stepExecution();
    }, delay);
  }
  function stopRun(){ machine.running=false; if(machine.timer){ clearInterval(machine.timer); machine.timer=null; } }

  // helpers: program load/save
  function saveProgramLocal(){ localStorage.setItem('sim_program', $('program-code').value); alert('Programa salvo localmente.'); }
  function loadProgramLocal(){ const p = localStorage.getItem('sim_program'); if(p){ $('program-code').value=p; alert('Programa carregado.'); } else alert('Nenhum programa salvo.'); }

  // wire local functions to UI names for easier mapping
  window.saveProgramLocal = saveProgramLocal; window.loadProgramLocal = loadProgramLocal;

  // attaching simple names used in HTML buttons
  function saveProgram(){ saveProgramLocal(); }
  function loadProgramLocalWrapper(){ loadProgramLocal(); }

  // Expose some functions for button wiring used earlier
  window.saveProgram = saveProgram; window.loadProgram = loadProgramLocalWrapper; window.saveMachineLocal = saveMachineLocal; window.loadMachineLocal = loadMachineLocal;

  // stub wrappers for earlier button ids
  function exportProgramText(){ const txt = $('program-code').value; const blob = new Blob([txt], {type:'text/plain'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='program.txt'; a.click(); URL.revokeObjectURL(url); }
  window.exportProgramText = exportProgramText;

  // expose validateProgram for button id
  window.validateProgram = validateProgram;

  // Hook up missing buttons that expect these names
  // Provide minimal implementations for save/load program buttons declared in HTML
  document.addEventListener('DOMContentLoaded', ()=>{
    // map buttons by id to functions if present
    const map = {
      'save-program': saveProgramLocal,
      'load-program': loadProgramLocal,
      'save-machine': saveMachineLocal,
      'load-machine': loadMachineLocal,
      'export-program': exportProgramText
    };
    for(let id in map){ const el=document.getElementById(id); if(el) el.onclick = map[id]; }
  });

  // finally start UI
  init();
})();
