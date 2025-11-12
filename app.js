(function () {
  const state = {
    registers: [],
    inputRegs: [],
    outputRegs: [],
    mathOps: {},
    logicTests: {},
    programLines: [
      { id: 1, label: '1', condReg: 'A', condTest: '= 0', thenGoto: '2', elseGoto: '' }
    ],
    inputValues: {},
    outputValues: {}
  };

  const availableMathOps = [
    'Soma (+)',
    'Subtracao (-)',
    'Multiplicacao (*)',
    'Divisao (/)',
    'Modulo (%)',
    'Incremento (++ )',
    'Decremento (--)'
  ];

  const availableLogicTests = ['= 0', '> 0', '< 0', '>= 0', '<= 0', '!= 0'];

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    Object.assign(els, {
      numRegisters: document.getElementById('numRegisters'),
      inputRegisters: document.getElementById('inputRegisters'),
      outputRegisters: document.getElementById('outputRegisters'),
      mathOperations: document.getElementById('mathOperations'),
      logicTests: document.getElementById('logicTests'),
      machineOutput: document.getElementById('machineOutput'),
      programLines: document.getElementById('programLines'),
      programOutput: document.getElementById('programOutput'),
      inputValues: document.getElementById('inputValues'),
      outputValues: document.getElementById('outputValues'),
      computationLog: document.getElementById('computationLog'),
      addProgramLine: document.getElementById('addProgramLine'),
      executeProgram: document.getElementById('executeProgram'),
      saveMachineFile: document.getElementById('saveMachineFile'),
      loadMachineFile: document.getElementById('loadMachineFile'),
      machineFileInput: document.getElementById('machineFileInput'),
      saveModal: document.getElementById('saveModal'),
      saveMachineOnly: document.getElementById('saveMachineOnly'),
      saveMachineWithProgram: document.getElementById('saveMachineWithProgram'),
      cancelSaveModal: document.getElementById('cancelSaveModal')
    });

    if (!els.numRegisters) return;

    els.numRegisters.addEventListener('change', updateRegisters);
    els.addProgramLine?.addEventListener('click', addProgramLine);
    els.executeProgram?.addEventListener('click', executeProgram);
    els.saveMachineFile?.addEventListener('click', openSaveModal);
    els.loadMachineFile?.addEventListener('click', () => els.machineFileInput?.click());
    els.machineFileInput?.addEventListener('change', handleMachineFileSelected);
    els.saveMachineOnly?.addEventListener('click', () => {
      saveMachineToFile(false);
      closeSaveModal();
    });
    els.saveMachineWithProgram?.addEventListener('click', () => {
      saveMachineToFile(true);
      closeSaveModal();
    });
    els.cancelSaveModal?.addEventListener('click', closeSaveModal);
    els.saveModal?.addEventListener('click', (event) => {
      if (event.target === els.saveModal) closeSaveModal();
    });
    document.addEventListener('keydown', handleModalKey);

    updateRegisters();
    setLog(['Defina as entradas e clique em Computar para iniciar.']);
  }

  function openSaveModal() {
    if (!els.saveModal) {
      saveMachineToFile(false);
      return;
    }
    els.saveModal.classList.add('show');
    els.saveModal.setAttribute('aria-hidden', 'false');
  }

  function closeSaveModal() {
    if (!els.saveModal) return;
    els.saveModal.classList.remove('show');
    els.saveModal.setAttribute('aria-hidden', 'true');
  }

  function handleModalKey(event) {
    if (event.key === 'Escape' && els.saveModal?.classList.contains('show')) {
      closeSaveModal();
    }
  }

  function generateRegisterNames(total) {
    return Array.from({ length: total }, (_, idx) => String.fromCharCode(65 + idx));
  }

  function updateRegisters() {
    const raw = Number(els.numRegisters.value);
    const clamped = Number.isFinite(raw) ? Math.min(16, Math.max(1, raw)) : 1;
    if (clamped !== raw) els.numRegisters.value = clamped;

    state.registers = generateRegisterNames(clamped);
    state.inputRegs = filterValidRegs(state.inputRegs);
    state.outputRegs = filterValidRegs(state.outputRegs);
    state.mathOps = filterRecord(state.mathOps);
    state.logicTests = filterRecord(state.logicTests);
    state.programLines = state.programLines.map((line) => ({
      ...line,
      condReg: state.registers.includes(line.condReg) ? line.condReg : state.registers[0] || ''
    }));
    syncOutputValues();

    renderInputRegisters();
    renderOutputRegisters();
    renderMathOperations();
    renderLogicTests();
    renderProgramLines();
    renderInputValues();
    renderOutputValues();
    updateMachineOutput();
    updateProgramOutput();
  }

  function filterValidRegs(list) {
    return list.filter((reg) => state.registers.includes(reg));
  }

  function filterRecord(record) {
    const next = {};
    state.registers.forEach((reg) => {
      if (record[reg]) next[reg] = record[reg];
    });
    return next;
  }

  function syncOutputValues() {
    const next = {};
    state.outputRegs.forEach((reg) => {
      if (state.outputValues[reg] !== undefined) next[reg] = state.outputValues[reg];
    });
    state.outputValues = next;
  }

  function renderInputRegisters() {
    if (!els.inputRegisters) return;
    els.inputRegisters.innerHTML = '';
    state.registers.forEach((reg) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'register-btn' + (state.inputRegs.includes(reg) ? ' selected-input' : '');
      btn.textContent = reg;
      btn.addEventListener('click', () => toggleInputReg(reg));
      els.inputRegisters.appendChild(btn);
    });
  }

  function renderOutputRegisters() {
    if (!els.outputRegisters) return;
    els.outputRegisters.innerHTML = '';
    state.registers.forEach((reg) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'register-btn' + (state.outputRegs.includes(reg) ? ' selected-output' : '');
      btn.textContent = reg;
      btn.addEventListener('click', () => toggleOutputReg(reg));
      els.outputRegisters.appendChild(btn);
    });
  }

  function toggleInputReg(reg) {
    const idx = state.inputRegs.indexOf(reg);
    if (idx >= 0) {
      state.inputRegs.splice(idx, 1);
    } else {
      state.inputRegs.push(reg);
      state.inputRegs = sortLikeRegisters(state.inputRegs);
    }
    renderInputRegisters();
    renderInputValues();
    updateMachineOutput();
  }

  function toggleOutputReg(reg) {
    const idx = state.outputRegs.indexOf(reg);
    if (idx >= 0) {
      state.outputRegs.splice(idx, 1);
    } else {
      state.outputRegs.push(reg);
      state.outputRegs = sortLikeRegisters(state.outputRegs);
    }
    syncOutputValues();
    renderOutputRegisters();
    renderOutputValues();
    updateMachineOutput();
  }

  function sortLikeRegisters(list) {
    return list.sort((a, b) => state.registers.indexOf(a) - state.registers.indexOf(b));
  }

  function renderMathOperations() {
    if (!els.mathOperations) return;
    els.mathOperations.innerHTML = '';
    state.registers.forEach((reg) => {
      const row = document.createElement('div');
      row.className = 'register-row';
      const label = document.createElement('strong');
      label.textContent = `${reg}`;
      row.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'ops-grid';

      availableMathOps.forEach((op) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'op-btn' + (state.mathOps[reg] === op ? ' selected' : '');
        btn.textContent = op;
        btn.addEventListener('click', () => toggleMathOp(reg, op));
        grid.appendChild(btn);
      });

      row.appendChild(grid);
      els.mathOperations.appendChild(row);
    });
  }

  function renderLogicTests() {
    if (!els.logicTests) return;
    els.logicTests.innerHTML = '';
    state.registers.forEach((reg) => {
      const row = document.createElement('div');
      row.className = 'register-row';
      const label = document.createElement('strong');
      label.textContent = `${reg}`;
      row.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'ops-grid';

      availableLogicTests.forEach((test) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'op-btn test-btn' + (state.logicTests[reg] === test ? ' selected' : '');
        btn.textContent = test;
        btn.addEventListener('click', () => toggleLogicTest(reg, test));
        grid.appendChild(btn);
      });

      row.appendChild(grid);
      els.logicTests.appendChild(row);
    });
  }

  function toggleMathOp(reg, op) {
    if (state.mathOps[reg] === op) delete state.mathOps[reg];
    else state.mathOps[reg] = op;
    renderMathOperations();
    updateMachineOutput();
  }

  function toggleLogicTest(reg, test) {
    if (state.logicTests[reg] === test) delete state.logicTests[reg];
    else state.logicTests[reg] = test;
    renderLogicTests();
    updateMachineOutput();
  }

  function updateMachineOutput() {
    if (!els.machineOutput) return;
    const lines = [];
    lines.push('DEFINICAO DA MAQUINA');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Registradores (${state.registers.length}): ${state.registers.join(', ') || '-'}`);
    lines.push(`Entradas: ${state.inputRegs.join(', ') || 'nenhuma'}`);
    lines.push(`Saidas: ${state.outputRegs.join(', ') || 'nenhuma'}`);
    lines.push('');
    lines.push('Operacoes:');
    if (Object.keys(state.mathOps).length === 0) {
      lines.push('  (sem operacoes atribuidas)');
    } else {
      Object.entries(state.mathOps).forEach(([reg, op]) => lines.push(`  ${reg}: ${op}`));
    }
    lines.push('');
    lines.push('Testes:');
    if (Object.keys(state.logicTests).length === 0) {
      lines.push('  (sem testes atribuidos)');
    } else {
      Object.entries(state.logicTests).forEach(([reg, test]) => lines.push(`  ${reg}: ${test}`));
    }
    els.machineOutput.textContent = lines.join('\n');
  }

  function renderProgramLines() {
    if (!els.programLines) return;
    els.programLines.innerHTML = '';
    if (state.programLines.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = 'Nenhuma linha cadastrada. Adicione uma linha para iniciar o programa.';
      els.programLines.appendChild(empty);
      return;
    }

    state.programLines.forEach((line, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'program-line';

      wrapper.appendChild(createInput(line.label, (value) => updateProgramLine(index, 'label', value), { width: '60px' }));
      wrapper.appendChild(createSpan(': se'));
      wrapper.appendChild(createSelect(state.registers, line.condReg, (value) => updateProgramLine(index, 'condReg', value)));
      wrapper.appendChild(createSelect(availableLogicTests, line.condTest, (value) => updateProgramLine(index, 'condTest', value)));
      wrapper.appendChild(createSpan('entao vá para'));
      wrapper.appendChild(createInput(line.thenGoto, (value) => updateProgramLine(index, 'thenGoto', value)));
      wrapper.appendChild(createSpan('senao vá para'));
      wrapper.appendChild(createInput(line.elseGoto, (value) => updateProgramLine(index, 'elseGoto', value)));

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-line';
      removeBtn.textContent = 'Remover';
      removeBtn.addEventListener('click', () => removeProgramLine(index));
      wrapper.appendChild(removeBtn);

      els.programLines.appendChild(wrapper);
    });
  }

  function createInput(value, handler, style = {}) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    Object.assign(input.style, style);
    input.addEventListener('input', (e) => handler(e.target.value.trim()));
    return input;
  }

  function createSpan(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
  }

  function createSelect(options, current, handler) {
    const select = document.createElement('select');
    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === current) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', (e) => handler(e.target.value));
    return select;
  }

  function addProgramLine() {
    const newId =
      state.programLines.reduce((max, line) => Math.max(max, Number(line.id) || 0), 0) + 1;
    state.programLines.push({
      id: newId,
      label: String(newId),
      condReg: state.registers[0] || '',
      condTest: '= 0',
      thenGoto: '',
      elseGoto: ''
    });
    renderProgramLines();
    updateProgramOutput();
  }

  function removeProgramLine(index) {
    state.programLines.splice(index, 1);
    renderProgramLines();
    updateProgramOutput();
  }

  function updateProgramLine(index, field, value) {
    state.programLines[index][field] = value;
    updateProgramOutput();
  }

  function updateProgramOutput() {
    if (!els.programOutput) return;
    els.programOutput.textContent = getProgramText();
  }

  function getProgramText() {
    const lines = [];
    lines.push('DEFINICAO DO PROGRAMA');
    lines.push('='.repeat(50));
    lines.push('');
    state.programLines.forEach((line) => {
      lines.push(
        `${line.label || '?'}: se ${line.condReg || '-'} ${line.condTest} entao vá para ${line.thenGoto ||
          '-'} senao vá para ${line.elseGoto || '-'}`
      );
    });
    return lines.join('\n');
  }

  function buildMachineSnapshot(includeProgram = false) {
    const snapshot = {
      schema: 'machine-config-v1',
      regCount: state.registers.length,
      inputRegs: [...state.inputRegs],
      outputRegs: [...state.outputRegs],
      mathOps: { ...state.mathOps },
      logicTests: { ...state.logicTests },
      createdAt: new Date().toISOString()
    };
    if (includeProgram) {
      snapshot.program = buildProgramSnapshot();
    }
    return snapshot;
  }

  function buildProgramSnapshot() {
    return {
      lines: state.programLines.map((line, index) => ({
        id: line.id ?? index + 1,
        label: line.label || String(line.id ?? index + 1),
        condReg: line.condReg || '',
        condTest: line.condTest || '= 0',
        thenGoto: line.thenGoto || '',
        elseGoto: line.elseGoto || ''
      })),
      text: getProgramText(),
      updatedAt: new Date().toISOString()
    };
  }

  function saveMachineToFile(includeProgram = false) {
    try {
      const snapshot = buildMachineSnapshot(includeProgram);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = includeProgram ? 'maquina_programa.json' : 'maquina.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Nao foi possivel salvar a maquina: ' + error.message);
    }
  }

  function handleMachineFileSelected(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snapshot = JSON.parse(reader.result);
        applyMachineSnapshot(snapshot);
        alert('Maquina carregada com sucesso.');
      } catch (error) {
        alert('Arquivo de maquina invalido: ' + error.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      alert('Nao foi possivel ler o arquivo selecionado.');
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  function applyMachineSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Estrutura vazia ou invalida.');
    }
    const regCount = Number(
      snapshot.regCount ?? snapshot.registerCount ?? snapshot.registersCount ?? snapshot.registers?.length
    );
    if (!Number.isInteger(regCount) || regCount < 1 || regCount > 16) {
      throw new Error('Quantidade de registradores invalida.');
    }
    els.numRegisters.value = regCount;
    state.inputRegs = Array.isArray(snapshot.inputRegs) ? snapshot.inputRegs.slice() : [];
    state.outputRegs = Array.isArray(snapshot.outputRegs) ? snapshot.outputRegs.slice() : [];
    state.mathOps = cloneRecord(snapshot.mathOps);
    state.logicTests = cloneRecord(snapshot.logicTests);
    if (snapshot.program && Array.isArray(snapshot.program.lines)) {
      state.programLines = snapshot.program.lines.map((line, index) => ({
        id: line.id ?? index + 1,
        label: line.label || String(line.id ?? index + 1),
        condReg: line.condReg || '',
        condTest: line.condTest || '= 0',
        thenGoto: line.thenGoto || '',
        elseGoto: line.elseGoto || ''
      }));
    }
    updateRegisters();
  }

  function cloneRecord(source) {
    if (!source || typeof source !== 'object') return {};
    return Object.fromEntries(
      Object.entries(source)
        .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
        .map(([key, value]) => [key, value])
    );
  }

  function renderInputValues() {
    if (!els.inputValues) return;
    els.inputValues.innerHTML = '';
    if (state.inputRegs.length === 0) {
      const helper = document.createElement('p');
      helper.className = 'helper-text';
      helper.textContent = 'Nenhum registrador marcado como entrada.';
      els.inputValues.appendChild(helper);
      return;
    }

    state.inputRegs.forEach((reg) => {
      const row = document.createElement('div');
      row.className = 'value-row';
      const label = document.createElement('strong');
      label.textContent = `${reg}:`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = state.inputValues[reg] !== undefined ? state.inputValues[reg] : 0;
      input.addEventListener('input', (e) => {
        state.inputValues[reg] = Number(e.target.value) || 0;
      });
      row.appendChild(label);
      row.appendChild(input);
      els.inputValues.appendChild(row);
    });
  }

  function renderOutputValues() {
    if (!els.outputValues) return;
    els.outputValues.innerHTML = '';
    if (state.outputRegs.length === 0) {
      const helper = document.createElement('p');
      helper.className = 'helper-text';
      helper.textContent = 'Nenhum registrador marcado como saida.';
      els.outputValues.appendChild(helper);
      return;
    }

    state.outputRegs.forEach((reg) => {
      const row = document.createElement('div');
      row.className = 'value-row';
      const label = document.createElement('strong');
      label.textContent = `${reg}:`;
      const value = document.createElement('span');
      value.className = 'value-output';
      value.textContent = state.outputValues[reg] !== undefined ? state.outputValues[reg] : '-';
      row.appendChild(label);
      row.appendChild(value);
      els.outputValues.appendChild(row);
    });
  }

  function executeProgram() {
    if (state.programLines.length === 0) {
      setLog(['Nenhuma linha de programa cadastrada.']);
      return;
    }
    if (state.registers.length === 0) {
      setLog(['Cadastre ao menos um registrador.']);
      return;
    }

    const regs = {};
    state.registers.forEach((reg) => {
      regs[reg] = state.inputRegs.includes(reg) ? Number(state.inputValues[reg]) || 0 : 0;
    });

    let currentIndex = 0;
    let steps = 0;
    const maxSteps = 1000;
    const log = [`Estado inicial: ${JSON.stringify(regs)}`];

    while (currentIndex >= 0 && currentIndex < state.programLines.length && steps < maxSteps) {
      const line = state.programLines[currentIndex];
      const reg = state.registers.includes(line.condReg) ? line.condReg : state.registers[0];
      if (!reg) {
        log.push('Nenhum registrador valido para avaliar. Encerrando.');
        break;
      }

      const regValue = Number(regs[reg]) || 0;
      const test = line.condTest || '= 0';
      const conditionMet = evaluateCondition(test, regValue);
      const nextLabel = (conditionMet ? line.thenGoto : line.elseGoto).trim();

      log.push(
        `Linha ${line.label || currentIndex + 1}: ${reg}=${regValue} teste "${test}" -> ${
          conditionMet ? 'entao' : 'senao'
        } vá para ${nextLabel || '-'}`
      );

      if (!nextLabel) {
        log.push('Programa encerrado (destino vazio).');
        break;
      }

      const nextIndex = state.programLines.findIndex((l) => l.label === nextLabel);
      if (nextIndex === -1) {
        log.push(`Programa encerrado (rotulo ${nextLabel} nao encontrado).`);
        break;
      }

      currentIndex = nextIndex;
      steps++;
    }

    if (steps >= maxSteps) {
      log.push('Aviso: limite de passos atingido (possivel loop infinito).');
    }

    state.outputRegs.forEach((reg) => {
      state.outputValues[reg] = regs[reg];
    });
    renderOutputValues();
    setLog(log);
  }

  function evaluateCondition(test, value) {
    switch (test) {
      case '= 0':
        return value === 0;
      case '> 0':
        return value > 0;
      case '< 0':
        return value < 0;
      case '>= 0':
        return value >= 0;
      case '<= 0':
        return value <= 0;
      case '!= 0':
        return value !== 0;
      default:
        return false;
    }
  }

  function setLog(lines) {
    if (!els.computationLog) return;
    const text = Array.isArray(lines) ? lines.join('\n') : String(lines);
    els.computationLog.textContent = text;
  }
})();
