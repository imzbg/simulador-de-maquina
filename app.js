(function () {
  const state = {
    registers: [],
    inputRegs: [],
    outputRegs: [],
    mathOps: {},
    logicTests: {},
    programLines: [
      {
        id: 1,
        label: '1',
        kind: 'se',
        condReg: 'A',
        condTest: '',
        actionOp: '',
        thenGoto: '2',
        elseGoto: ''
      }
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
  const programModes = ['se', 'faça'];

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
    state.programLines = state.programLines.map(normalizeProgramLine);
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

  function asArray(value) {
    if (Array.isArray(value)) {
      return value.filter((entry) => typeof entry === 'string' && entry.trim());
    }
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }

  function getSelections(record, reg) {
    const arr = record?.[reg];
    return Array.isArray(arr) ? arr.slice() : [];
  }

  function sortSelections(values, catalog) {
    const lookup = new Set(values);
    return catalog.filter((item) => lookup.has(item));
  }

  function toggleSelection(record, catalog, reg, value) {
    const selections = getSelections(record, reg);
    const idx = selections.indexOf(value);
    if (idx >= 0) selections.splice(idx, 1);
    else selections.push(value);
    const ordered = sortSelections(selections, catalog);
    if (ordered.length) record[reg] = ordered;
    else delete record[reg];
  }

  function filterRecord(record) {
    const next = {};
    state.registers.forEach((reg) => {
      const arr = asArray(record[reg]);
      if (arr.length) next[reg] = arr;
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

  function getMathOpsForReg(reg) {
    return getSelections(state.mathOps, reg);
  }

  function getLogicTestsForReg(reg) {
    return getSelections(state.logicTests, reg);
  }

  function pickFirstValidValue(reg, current, generator) {
    const options = generator(reg);
    if (options.length === 0) return '';
    if (current && options.includes(current)) return current;
    return options[0];
  }

  function normalizeProgramLine(line) {
    const normalized = { ...line };
    normalized.kind = normalized.kind === 'faça' ? 'faça' : 'se';
    normalized.condReg = state.registers.includes(normalized.condReg)
      ? normalized.condReg
      : state.registers[0] || '';
    if (normalized.kind === 'se') {
      normalized.condTest = pickFirstValidValue(
        normalized.condReg,
        normalized.condTest,
        getLogicTestsForReg
      );
    } else {
      normalized.actionOp = pickFirstValidValue(
        normalized.condReg,
        normalized.actionOp,
        getMathOpsForReg
      );
    }
    normalized.thenGoto = normalized.thenGoto || '';
    normalized.elseGoto = normalized.elseGoto || '';
    normalized.actionOp = normalized.actionOp || '';
    normalized.condTest = normalized.condTest || '';
    return normalized;
  }

  function syncProgramLinesForReg(reg) {
    state.programLines = state.programLines.map((line) =>
      line.condReg === reg ? normalizeProgramLine(line) : line
    );
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

      const selections = getMathOpsForReg(reg);
      availableMathOps.forEach((op) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'op-btn' + (selections.includes(op) ? ' selected' : '');
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

      const selections = getLogicTestsForReg(reg);
      availableLogicTests.forEach((test) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'op-btn test-btn' + (selections.includes(test) ? ' selected' : '');
        btn.textContent = test;
        btn.addEventListener('click', () => toggleLogicTest(reg, test));
        grid.appendChild(btn);
      });

      row.appendChild(grid);
      els.logicTests.appendChild(row);
    });
  }

  function toggleMathOp(reg, op) {
    toggleSelection(state.mathOps, availableMathOps, reg, op);
    syncProgramLinesForReg(reg);
    renderMathOperations();
    renderProgramLines();
    updateMachineOutput();
  }

  function toggleLogicTest(reg, test) {
    toggleSelection(state.logicTests, availableLogicTests, reg, test);
    syncProgramLinesForReg(reg);
    renderLogicTests();
    renderProgramLines();
    updateMachineOutput();
  }

  function updateMachineOutput() {
    if (!els.machineOutput) return;
    const lines = [];
    const registerCount = Math.max(state.registers.length, 1);
    const memorySet = `N^${registerCount}`;
    const inputSet = `N^${Math.max(state.inputRegs.length, 1)}`;
    const outputSet = `N^${Math.max(state.outputRegs.length, 1)}`;
    const machineName = `M_${registerCount}`;
    const operationsSymbols = collectFunctionSymbols(state.mathOps);
    const testSymbols = collectFunctionSymbols(state.logicTests);

    lines.push(
      `${machineName} = (${memorySet}, ${inputSet}, ${outputSet}, {${operationsSymbols.join(', ') ||
        '-'}}, {${testSymbols.join(', ') || '-'}})`
    );
    lines.push('');
    lines.push(`${memorySet}, ${inputSet}, ${outputSet} - Conjuntos de Memoria, Entrada e Saida`);
    lines.push('');
    lines.push('Operacoes definidas:');
    if (operationsSymbols.length === 0) {
      lines.push('  (nenhuma operacao configurada)');
    } else {
      appendFunctionDescriptions(lines, state.mathOps, memorySet, 'operacao');
    }
    lines.push('');
    lines.push('Testes logicos definidos:');
    if (testSymbols.length === 0) {
      lines.push('  (nenhum teste configurado)');
    } else {
      appendFunctionDescriptions(lines, state.logicTests, memorySet, 'teste');
    }
    els.machineOutput.textContent = lines.join('\n');
  }

  function collectFunctionSymbols(record) {
    const symbols = [];
    Object.entries(record || {}).forEach(([reg, values]) => {
      asArray(values).forEach((value) => symbols.push(formatFunctionSymbol(value, reg)));
    });
    return symbols;
  }

  function formatFunctionSymbol(label, reg) {
    const slug = String(label || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'funcao';
    return `${slug}_${(reg || '').toLowerCase()}`;
  }

  function appendFunctionDescriptions(lines, record, domain, type) {
    Object.entries(record || {}).forEach(([reg, values]) => {
      const selections = asArray(values);
      if (selections.length === 0) return;
      lines.push(`  ${reg}: ${selections.join(', ')}`);
      selections.forEach((label) => {
        const symbol = formatFunctionSymbol(label, reg);
        if (type === 'operacao') {
          lines.push(
            `    ${symbol}: ${domain} -> ${domain} tal que aplica "${label}" sob o registrador ${reg}`
          );
        } else {
          lines.push(
            `    ${symbol}: ${domain} -> {verdadeiro, falso} tal que testa "${label}" no registrador ${reg}`
          );
        }
      });
    });
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

      wrapper.appendChild(
        createInput(line.label, (value) => updateProgramLine(index, 'label', value), {
          width: '60px'
        })
      );
      wrapper.appendChild(createSpan(':'));
      wrapper.appendChild(
        createSelect(
          programModes,
          line.kind,
          (value) => updateProgramLine(index, 'kind', value, { rerender: true }),
          { style: { width: '80px' } }
        )
      );
      wrapper.appendChild(
        createSelect(
          state.registers,
          line.condReg,
          (value) => updateProgramLine(index, 'condReg', value, { rerender: true }),
          { style: { minWidth: '70px', maxWidth: '90px' } }
        )
      );

      if (line.kind === 'faça') {
        const ops = getMathOpsForReg(line.condReg);
        wrapper.appendChild(
          createSelect(
            ops,
            line.actionOp,
            (value) => updateProgramLine(index, 'actionOp', value),
            {
              placeholder: 'Nenhuma operacao vinculada',
              style: { minWidth: '150px' }
            }
          )
        );
        wrapper.appendChild(createSpan('e vá para'));
        wrapper.appendChild(
          createInput(
            line.thenGoto,
            (value) => updateProgramLine(index, 'thenGoto', value),
            { width: '90px' }
          )
        );
      } else {
        const tests = getLogicTestsForReg(line.condReg);
        wrapper.appendChild(
          createSelect(
            tests,
            line.condTest,
            (value) => updateProgramLine(index, 'condTest', value),
            {
              placeholder: 'Nenhum teste vinculado',
              style: { minWidth: '130px' }
            }
          )
        );
        wrapper.appendChild(createSpan('entao vá para'));
        wrapper.appendChild(
          createInput(
            line.thenGoto,
            (value) => updateProgramLine(index, 'thenGoto', value),
            { width: '90px' }
          )
        );
        wrapper.appendChild(createSpan('senao vá para'));
        wrapper.appendChild(
          createInput(
            line.elseGoto,
            (value) => updateProgramLine(index, 'elseGoto', value),
            { width: '90px' }
          )
        );
      }

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

  function createSelect(options, current, handler, config = {}) {
    const select = document.createElement('select');
    if (config.style) Object.assign(select.style, config.style);
    const normalized = (options || []).map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
    if (normalized.length === 0) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = config.placeholder || 'Sem opcoes disponiveis';
      select.appendChild(placeholder);
      select.disabled = true;
    } else {
      normalized.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === current) option.selected = true;
        select.appendChild(option);
      });
    }
    if (config.disabled) select.disabled = true;
    select.addEventListener('change', (e) => handler(e.target.value));
    return select;
  }

  function addProgramLine() {
    const newId =
      state.programLines.reduce((max, line) => Math.max(max, Number(line.id) || 0), 0) + 1;
    const baseReg = state.registers[0] || '';
    const nextLine = normalizeProgramLine({
      id: newId,
      label: String(newId),
      kind: 'se',
      condReg: baseReg,
      condTest: '',
      actionOp: '',
      thenGoto: '',
      elseGoto: ''
    });
    state.programLines.push(nextLine);
    renderProgramLines();
    updateProgramOutput();
  }

  function removeProgramLine(index) {
    state.programLines.splice(index, 1);
    renderProgramLines();
    updateProgramOutput();
  }

  function updateProgramLine(index, field, value, options = {}) {
    if (!state.programLines[index]) return;
    state.programLines[index][field] = value;
    state.programLines[index] = normalizeProgramLine(state.programLines[index]);
    updateProgramOutput();
    if (options.rerender) renderProgramLines();
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
      if (line.kind === 'faça') {
        lines.push(
          `${line.label || '?'}: faça ${line.condReg || '-'} ${line.actionOp ||
            '(sem operacao)'} e vá para ${line.thenGoto || '-'}`
        );
      } else {
        lines.push(
          `${line.label || '?'}: se ${line.condReg || '-'} ${line.condTest ||
            '(sem teste)'} entao vá para ${line.thenGoto || '-'} senao vá para ${line.elseGoto || '-'}`
        );
      }
    });

    return lines.join('\n');
  }

  function buildMachineSnapshot(includeProgram = false) {
    const snapshot = {
      schema: 'machine-config-v1',
      regCount: state.registers.length,
      inputRegs: [...state.inputRegs],
      outputRegs: [...state.outputRegs],
      mathOps: filterRecord(state.mathOps),
      logicTests: filterRecord(state.logicTests),
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
        kind: line.kind === 'faça' ? 'faça' : 'se',
        condReg: line.condReg || '',
        condTest: line.condTest || '',
        actionOp: line.actionOp || '',
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
        kind: line.kind === 'faça' ? 'faça' : 'se',
        condReg: line.condReg || '',
        condTest: line.condTest || '',
        actionOp: line.actionOp || '',
        thenGoto: line.thenGoto || '',
        elseGoto: line.elseGoto || ''
      }));
    }
    updateRegisters();
  }

  function cloneRecord(source) {
    if (!source || typeof source !== 'object') return {};
    const next = {};
    Object.entries(source).forEach(([key, value]) => {
      if (typeof key !== 'string') return;
      const arr = asArray(value);
      if (arr.length) next[key] = arr;
    });
    return next;
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

      if (line.kind === 'faça') {
        const nextLabel = (line.thenGoto || '').trim();
        if (!line.actionOp) {
          log.push(`Linha ${line.label || currentIndex + 1}: nenhuma operacao definida. Encerrando.`);
          break;
        }
        const updatedValue = applyOperation(line.actionOp, regValue);
        regs[reg] = updatedValue;
        log.push(
          `Linha ${line.label || currentIndex + 1}: faça ${reg} ${line.actionOp} -> ${reg}=${updatedValue} e vá para ${nextLabel || '-'}`
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
        continue;
      }

      const test = line.condTest;
      if (!test) {
        log.push(`Linha ${line.label || currentIndex + 1}: nenhum teste configurado. Encerrando.`);
        break;
      }
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

  function applyOperation(operation, value) {
    const current = Number(value) || 0;
    switch (operation) {
      case 'Soma (+)':
      case 'Incremento (++ )':
        return current + 1;
      case 'Subtracao (-)':
      case 'Decremento (--)':
        return Math.max(0, current - 1);
      case 'Multiplicacao (*)':
        return current * 2;
      case 'Divisao (/)':
        return current === 0 ? 0 : Math.trunc(current / 2);
      case 'Modulo (%)':
        return current % 2;
      default:
        return current;
    }
  }

  function setLog(lines) {
    if (!els.computationLog) return;
    const text = Array.isArray(lines) ? lines.join('\n') : String(lines);
    els.computationLog.textContent = text;
  }
})();
