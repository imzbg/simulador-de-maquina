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
        actionValue: '1',
        thenGoto: '2',
        elseGoto: ''
      }
    ],
    inputValues: {},
    outputValues: {}
  };

  const availableMathOps = [
    { id: 'add', label: 'Soma', display: 'Soma (+)', symbol: '+', usesValue: true },
    { id: 'sub', label: 'Subtração', display: 'Subtração (-)', symbol: '-', usesValue: true },
    { id: 'mul', label: 'Multiplicação', display: 'Multiplicação (*)', symbol: '*', usesValue: true },
    { id: 'div', label: 'Divisão', display: 'Divisão (/)', symbol: '/', usesValue: true },
    { id: 'mod', label: 'Módulo', display: 'Módulo (%)', symbol: '%', usesValue: true },
    { id: 'inc', label: 'Incremento', display: 'Incremento (++ )', symbol: '++', usesValue: true },
    { id: 'dec', label: 'Decremento', display: 'Decremento (--)', symbol: '--', usesValue: true }
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


  function getMathOpById(id) {
    return availableMathOps.find((op) => op.id === id) || null;
  }

  function getMathOpDisplay(id) {
    const op = getMathOpById(id);
    return op ? op.display : id || '(sem operação)';
  }

  function getMathOpLabel(id) {
    const op = getMathOpById(id);
    return op ? op.label : id || '(sem operação)';
  }

  function getMathOpIdFromLegacy(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    let op =
      availableMathOps.find((o) => o.id === trimmed) ||
      availableMathOps.find((o) => o.label === trimmed) ||
      availableMathOps.find((o) => o.display === trimmed);
    return op ? op.id : null;
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

  function getStaticActionValue(actionOpId) {
    if (actionOpId === 'mul' || actionOpId === 'div') return '2';
    return '1';
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

    normalized.thenGoto = normalized.thenGoto || '0';
    if (normalized.kind === 'se') {
      normalized.elseGoto = normalized.elseGoto || '0';
    } else {
      normalized.elseGoto = '0';
    }

    normalized.actionOp = normalized.actionOp || '';
    normalized.condTest = normalized.condTest || '';
    normalized.actionValue =
      normalized.kind === 'faça' ? getStaticActionValue(normalized.actionOp) : '1';

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
    const opIdsCatalog = availableMathOps.map((op) => op.id);

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
        const isSelected = selections.includes(op.id);
        btn.className = 'op-btn' + (isSelected ? ' selected' : '');
        btn.textContent = op.display;
        btn.addEventListener('click', () => toggleMathOp(reg, op.id, opIdsCatalog));
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

  function toggleMathOp(reg, opId, opIdsCatalog) {
    toggleSelection(state.mathOps, opIdsCatalog, reg, opId);
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


  function mathBaseNameFromOp(op) {
    if (!op || !op.id) return 'op';
    switch (op.id) {
      case 'add':
        return 'adiciona';
      case 'sub':
        return 'subtrai';
      case 'mul':
        return 'multiplica';
      case 'div':
        return 'divide';
      case 'mod':
        return 'modulo';
      case 'inc':
        return 'incrementa';
      case 'dec':
        return 'decrementa';
      default:
        return 'op';
    }
  }

  function buildOperationSymbol(op, reg) {
    const base = mathBaseNameFromOp(op);
    return `${base}_${(reg || '').toLowerCase()}`;
  }

  function buildTestSymbol(testLabel, reg) {
    if (testLabel === '= 0') {
      return `${(reg || '').toLowerCase()}_zero`;
    }
    return formatFunctionSymbol(testLabel, reg);
  }

  function uniq(arr) {
    const seen = new Set();
    const out = [];
    (arr || []).forEach((v) => {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    });
    return out;
  }

  function buildTupleVarNames(count) {
    if (count === 2) return ['n', 'm'];
    const vars = [];
    for (let i = 1; i <= count; i++) {
      vars.push(`x${i}`);
    }
    return vars;
  }

  function buildInputTupleForReg(reg, totalRegs) {
    const idx = Math.max(0, state.registers.indexOf(reg));
    const parts = [];
    for (let i = 0; i < totalRegs; i++) {
      parts.push(i === idx ? 'n' : '0');
    }
    return `(${parts.join(', ')})`;
  }

  function addOperationSemantics(lines, symbol, memorySet, reg, op, tupleVars) {
    const regIndex = Math.max(0, state.registers.indexOf(reg));
    const tupleStr = `(${tupleVars.join(', ')})`;
    const regVar = tupleVars[regIndex] || tupleVars[0];

    if (op.id === 'sub' || op.id === 'dec') {
      const posParts = tupleVars.map((v, i) => (i === regIndex ? `${regVar}-1` : v));
      const zeroParts = tupleVars.map((v, i) => (i === regIndex ? '0' : v));
      lines.push(
        `    ${symbol}: ${memorySet} → ${memorySet} tal que, ∀${tupleStr}∈${memorySet},`
      );
      lines.push(
        `      ${symbol}${tupleStr} = (${posParts.join(', ')}), se ${regVar} > 0; ${symbol}${tupleStr} = (${zeroParts.join(', ')}), se ${regVar} = 0`
      );
      return;
    }

    if (op.id === 'add' || op.id === 'inc') {
      const parts = tupleVars.map((v, i) => (i === regIndex ? `${regVar}+1` : v));
      lines.push(
        `    ${symbol}: ${memorySet} → ${memorySet} tal que, ∀${tupleStr}∈${memorySet}, ${symbol}${tupleStr} = (${parts.join(', ')})`
      );
      return;
    }

    lines.push(
      `    ${symbol}: ${memorySet} → ${memorySet} tal que, ∀${tupleStr}∈${memorySet}, ${symbol}${tupleStr} atualiza o componente correspondente ao registrador ${reg} aplicando "${op.display}".`
    );
  }

  function addTestSemantics(lines, symbol, memorySet, reg, testLabel, tupleVars) {
    const regIndex = Math.max(0, state.registers.indexOf(reg));
    const tupleStr = `(${tupleVars.join(', ')})`;
    const regVar = tupleVars[regIndex] || tupleVars[0];

    if (testLabel === '= 0') {
      lines.push(
        `    ${symbol}: ${memorySet} → {verdadeiro, falso} tal que, ∀${tupleStr}∈${memorySet},`
      );
      lines.push(
        `      ${symbol}${tupleStr} = verdadeiro, se ${regVar} = 0; ${symbol}${tupleStr} = falso, se ${regVar} ≠ 0`
      );
      return;
    }

    lines.push(
      `    ${symbol}: ${memorySet} → {verdadeiro, falso} tal que, ∀${tupleStr}∈${memorySet}, ${symbol}${tupleStr} indica se o valor do registrador ${reg} satisfaz o teste "${testLabel}".`
    );
  }

  function updateMachineOutput() {
    if (!els.machineOutput) return;

    const lines = [];
    const registerCount = Math.max(state.registers.length, 1);
    const memorySet = registerCount === 1 ? 'N' : `N${registerCount}`;

    const inputDim = state.inputRegs.length || 1;
    const outputDim = state.outputRegs.length || 1;
    const inputSet = inputDim === 1 ? 'N' : `N${inputDim}`;
    const outputSet = outputDim === 1 ? 'N' : `N${outputDim}`;

    let machineName = `M_${registerCount}`;
    if (
      registerCount === 2 &&
      state.registers[0] === 'A' &&
      state.registers[1] === 'B'
    ) {
      machineName = 'dois_reg';
    }

    const inputFunctions = state.inputRegs.map((reg) => `armazena_${reg.toLowerCase()}`);
    const outputFunctions = state.outputRegs.map((reg) => `retorna_${reg.toLowerCase()}`);

    const operationSymbols = [];
    Object.entries(state.mathOps || {}).forEach(([reg, values]) => {
      asArray(values).forEach((opId) => {
        const op = getMathOpById(opId);
        if (!op) return;
        operationSymbols.push(buildOperationSymbol(op, reg));
      });
    });

    const testSymbols = [];
    Object.entries(state.logicTests || {}).forEach(([reg, values]) => {
      asArray(values).forEach((testLabel) => {
        testSymbols.push(buildTestSymbol(testLabel, reg));
      });
    });

    const opsSet = uniq(operationSymbols);
    const testsSet = uniq(testSymbols);

    lines.push(
      `${machineName} = (${memorySet}, ${inputSet}, ${outputSet}, ${inputFunctions.join(', ') ||
        '-'}, ${outputFunctions.join(', ') || '-'}, {${opsSet.join(', ') ||
        '-'}}, {${testsSet.join(', ') || '-'}})`
    );
    lines.push('');
    lines.push(`${memorySet}, ${inputSet}, ${outputSet} - Conjuntos de Memória, Entrada e Saída`);
    lines.push('');

    if (inputFunctions.length > 0) {
      state.inputRegs.forEach((reg) => {
        const fname = `armazena_${reg.toLowerCase()}`;
        const tuple = buildInputTupleForReg(reg, registerCount);
        lines.push(
          `${fname}: N → ${memorySet} tal que, ∀n∈N, ${fname}(n) = ${tuple}`
        );
      });
      lines.push('');
    }

    if (outputFunctions.length > 0) {
      const tupleVars = buildTupleVarNames(registerCount);
      const tupleStr = `(${tupleVars.join(', ')})`;
      state.outputRegs.forEach((reg) => {
        const fname = `retorna_${reg.toLowerCase()}`;
        const idx = Math.max(0, state.registers.indexOf(reg));
        const component = tupleVars[idx] || tupleVars[0];
        lines.push(
          `${fname}: ${memorySet} → N tal que, ∀${tupleStr}∈${memorySet}, ${fname}${tupleStr} = ${component}`
        );
      });
      lines.push('');
    }

    lines.push('Operações matemáticas definidas:');
    if (opsSet.length === 0) {
      lines.push('  (nenhuma operação configurada)');
    } else {
      appendFunctionDescriptions(lines, state.mathOps, memorySet, 'operacao');
    }
    lines.push('');

    lines.push('Testes lógicos definidos:');
    if (testsSet.length === 0) {
      lines.push('  (nenhum teste configurado)');
    } else {
      appendFunctionDescriptions(lines, state.logicTests, memorySet, 'teste');
    }

    els.machineOutput.textContent = lines.join('\n');
  }

  function collectOperationSymbols() {
    const symbols = [];
    Object.entries(state.mathOps || {}).forEach(([reg, values]) => {
      asArray(values).forEach((opId) => {
        const op = getMathOpById(opId);
        if (!op) return;
        symbols.push(formatFunctionSymbol(op.label, reg));
      });
    });
    return symbols;
  }

  function collectTestSymbols() {
    const symbols = [];
    Object.entries(state.logicTests || {}).forEach(([reg, values]) => {
      asArray(values).forEach((label) => {
        symbols.push(formatFunctionSymbol(label, reg));
      });
    });
    return symbols;
  }

  function formatFunctionSymbol(label, reg) {
    const slug =
      String(label || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') || 'funcao';
    return `${slug}_${(reg || '').toLowerCase()}`;
  }

  function appendFunctionDescriptions(lines, record, domain, type) {
    const regCount = Math.max(state.registers.length, 1);
    const tupleVars = buildTupleVarNames(regCount);

    Object.entries(record || {}).forEach(([reg, values]) => {
      const selections = asArray(values);
      if (selections.length === 0) return;

      if (type === 'operacao') {
        const ops = selections
          .map((opId) => getMathOpById(opId))
          .filter((op) => !!op);
        if (ops.length === 0) return;
        const labels = ops.map((op) => op.display);
        lines.push(`  ${reg}: ${labels.join(', ')}`);
        ops.forEach((op) => {
          const symbol = buildOperationSymbol(op, reg);
          addOperationSemantics(lines, symbol, domain, reg, op, tupleVars);
        });
      } else {
        lines.push(`  ${reg}: ${selections.join(', ')}`);
        selections.forEach((testLabel) => {
          const symbol = buildTestSymbol(testLabel, reg);
          addTestSemantics(lines, symbol, domain, reg, testLabel, tupleVars);
        });
      }
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
        createInput(
          line.label,
          (value) => updateProgramLine(index, 'label', value, { rerender: false }),
          {
            style: { width: '60px' },
            autoZero: true
          }
        )
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
        const opIds = getMathOpsForReg(line.condReg);
        const options = opIds
          .map((id) => {
            const op = getMathOpById(id);
            return op
              ? { value: op.id, label: op.display }
              : { value: id, label: id };
          });

        wrapper.appendChild(
          createSelect(
            options,
            line.actionOp,
            (value) => updateProgramLine(index, 'actionOp', value, { rerender: true }),
            {
              placeholder: 'Nenhuma operação vinculada',
              style: { minWidth: '170px' }
            }
          )
        );

        wrapper.appendChild(createSpan('k ='));
        wrapper.appendChild(
          createInput(
            line.actionValue,
            () => {},
            { style: { width: '60px' }, type: 'number', disabled: true }
          )
        );

        wrapper.appendChild(createSpan('e vá para'));
        wrapper.appendChild(
          createInput(
            line.thenGoto,
            (value) => updateProgramLine(index, 'thenGoto', value),
            { style: { width: '90px' }, autoZero: true }
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
        wrapper.appendChild(createSpan('então vá para'));
        wrapper.appendChild(
          createInput(
            line.thenGoto,
            (value) => updateProgramLine(index, 'thenGoto', value),
            { style: { width: '90px' }, autoZero: true }
          )
        );
        wrapper.appendChild(createSpan('senão vá para'));
        wrapper.appendChild(
          createInput(
            line.elseGoto,
            (value) => updateProgramLine(index, 'elseGoto', value),
            { style: { width: '90px' }, autoZero: true }
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

  function createInput(value, handler, options = {}) {
    const input = document.createElement('input');
    input.type = options.type || 'text';
    input.value = value !== undefined && value !== null ? value : '';
    if (options.style) Object.assign(input.style, options.style);
    if (options.placeholder) input.placeholder = options.placeholder;
    const applyValue = (raw) => handler(typeof raw === 'string' ? raw.trim() : raw);
    if (options.disabled) input.disabled = true;
    if (!options.disabled) {
      input.addEventListener('input', (e) => applyValue(e.target.value));
      if (options.autoZero) {
        input.addEventListener('blur', () => {
          if (!input.value.trim()) {
            input.value = '0';
            applyValue('0');
          }
        });
      }
    }
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

    let normalized;
    if (Array.isArray(options) && options.length && typeof options[0] === 'object') {
      normalized = options.map((opt) => ({
        value: opt.value,
        label: opt.label
      }));
    } else {
      normalized = (options || []).map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      );
    }

    if (normalized.length === 0) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = config.placeholder || 'Sem opções disponíveis';
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
      actionValue: '1',
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

  function normalizeProgramFieldValue(field, value) {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (['label', 'thenGoto', 'elseGoto'].includes(field)) {
      return trimmed || '0';
    }
    if (field === 'actionValue') {
      return trimmed === '' || trimmed === undefined || trimmed === null ? '1' : String(trimmed);
    }
    return trimmed;
  }

  function updateProgramLine(index, field, value, options = {}) {
    if (!state.programLines[index]) return;
    const normalizedValue = normalizeProgramFieldValue(field, value);
    state.programLines[index][field] = normalizedValue;
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
    lines.push('DEFINIÇÃO DO PROGRAMA');
    lines.push('='.repeat(50));
    lines.push('');
    state.programLines.forEach((line) => {
      if (line.kind === 'faça') {
        const opDisplay = getMathOpDisplay(line.actionOp);
        const k = line.actionValue || '1';
        lines.push(
          `${line.label || '?'}: faça ${line.condReg || '-'} ${opDisplay} k=${k} e vá para ${
            line.thenGoto || '-'
          }`
        );
      } else {
        lines.push(
          `${line.label || '?'}: se ${line.condReg || '-'} ${line.condTest ||
            '(sem teste)'} então vá para ${line.thenGoto || '-'} senão vá para ${
            line.elseGoto || '-'
          }`
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
        actionValue: line.actionValue || '1',
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
      alert('Não foi possível salvar a máquina: ' + error.message);
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
        alert('Máquina carregada com sucesso.');
      } catch (error) {
        alert('Arquivo de máquina inválido: ' + error.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      alert('Não foi possível ler o arquivo selecionado.');
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  function applyMachineSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Estrutura vazia ou inválida.');
    }
    const regCount = Number(
      snapshot.regCount ??
        snapshot.registerCount ??
        snapshot.registersCount ??
        snapshot.registers?.length
    );
    if (!Number.isInteger(regCount) || regCount < 1 || regCount > 16) {
      throw new Error('Quantidade de registradores inválida.');
    }
    els.numRegisters.value = regCount;
    state.inputRegs = Array.isArray(snapshot.inputRegs) ? snapshot.inputRegs.slice() : [];
    state.outputRegs = Array.isArray(snapshot.outputRegs) ? snapshot.outputRegs.slice() : [];
    state.mathOps = normalizeMathOpsRecord(snapshot.mathOps);
    state.logicTests = cloneRecord(snapshot.logicTests);

    if (snapshot.program && Array.isArray(snapshot.program.lines)) {
      state.programLines = snapshot.program.lines.map((line, index) => {
        const kind = line.kind === 'faça' ? 'faça' : 'se';
        const actionOp = line.actionOp || '';
        return {
          id: line.id ?? index + 1,
          label: line.label || String(line.id ?? index + 1),
          kind,
          condReg: line.condReg || '',
          condTest: line.condTest || '',
          actionOp,
          actionValue: kind === 'faça' ? getStaticActionValue(actionOp) : '1',
          thenGoto: line.thenGoto || '',
          elseGoto: line.elseGoto || ''
        };
      });
    }

    updateRegisters();
  }

  function normalizeMathOpsRecord(source) {
    if (!source || typeof source !== 'object') return {};
    const next = {};
    Object.entries(source).forEach(([key, value]) => {
      if (typeof key !== 'string') return;
      const entries = asArray(value);
      const mapped = entries
        .map((entry) => getMathOpIdFromLegacy(entry))
        .filter((id) => !!id);
      if (mapped.length) next[key] = mapped;
    });
    return next;
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
      helper.textContent = 'Nenhum registrador marcado como saída.';
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
        log.push('Nenhum registrador válido para avaliar. Encerrando.');
        break;
      }

      const regValue = Number(regs[reg]) || 0;

      if (line.kind === 'faça') {
        const nextLabel = (line.thenGoto || '').trim();
        if (!line.actionOp) {
          log.push(`Linha ${line.label || currentIndex + 1}: nenhuma operação definida. Encerrando.`);
          break;
        }
        const k = Number(line.actionValue) || 0;
        const updatedValue = applyOperation(line.actionOp, regValue, k);
        const opDisplay = getMathOpDisplay(line.actionOp);
        regs[reg] = updatedValue;
        log.push(
          `Linha ${line.label || currentIndex + 1}: faça ${reg} ${opDisplay} k=${k} -> ${reg}=${updatedValue} e vá para ${nextLabel || '-'}`
        );
        if (!nextLabel) {
          log.push('Programa encerrado (destino vazio).');
          break;
        }
        const nextIndex = state.programLines.findIndex((l) => l.label === nextLabel);
        if (nextIndex === -1) {
          log.push(`Programa encerrado (rótulo ${nextLabel} não encontrado).`);
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
          conditionMet ? 'então' : 'senão'
        } vá para ${nextLabel || '-'}`
      );

      if (!nextLabel) {
        log.push('Programa encerrado (destino vazio).');
        break;
      }

      const nextIndex = state.programLines.findIndex((l) => l.label === nextLabel);
      if (nextIndex === -1) {
        log.push(`Programa encerrado (rótulo ${nextLabel} não encontrado).`);
        break;
      }

      currentIndex = nextIndex;
      steps++;
    }

    if (steps >= maxSteps) {
      log.push('Aviso: limite de passos atingido (possível loop infinito).');
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

  function applyOperation(operationId, value, k) {
    const current = Number(value) || 0;
    const param = Number(k);
    const n = Number.isFinite(param) ? param : 0;

    switch (operationId) {
      case 'add':
        return current + n;
      case 'sub':
        return Math.max(0, current - n);
      case 'mul':
        return current * n;
      case 'div':
        if (n === 0) return current;
        return Math.trunc(current / n);
      case 'mod':
        if (n === 0) return current;
        return current % n;
      case 'inc':
        return current + (n || 1);
      case 'dec':
        return Math.max(0, current - (n || 1));
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
