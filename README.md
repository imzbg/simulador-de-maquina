# Simulador de Maquina com Programa Condicional

Ferramenta em HTML/CSS/JS que permite definir uma maquina abstrata baseada em registradores,
montar um programa condicional simples (goto por rotulo) e observar a execucao passo a passo,
incluindo exportacao/importacao da configuracao em arquivos locais.

## Principais recursos
- **Registradores dinamicos**: selecione de 1 a 16 registradores nomeados A..P.
- **Entradas e saidas**: marque quais registradores servem como fila de entrada e quais guardam a saida final.
- **Operacoes e testes por registrador**: escolha uma ou mais operacoes matematicas e testes logicos permitidos para cada registrador.
- **Construtor de programa**: defina linhas rotuladas como `se` (usa um teste selecionado) ou `faça` (executa uma operacao atribuida) e visualize a versao textual automaticamente.
- **Execucao monitorada**: informe valores de entrada, execute o programa e acompanhe o log detalhado das decisoes.
- **Exportar/Importar**: salve a maquina (com ou sem o programa) em arquivo `.json` e carregue a mesma configuracao posteriormente.

## Como executar
1. Baixe ou clone o repositorio.
2. Abra `index.html` em um navegador moderno (Chrome, Edge ou Firefox recentes).
3. Nenhuma dependencia adicional e necessária; todo o codigo roda no navegador.

## Fluxo sugerido
1. **Definir maquina**
   - Ajuste o numero de registradores.
   - Clique nos registradores para marca-los como entrada ou saida.
   - Escolha as operacoes e testes que cada registrador pode usar.
2. **Salvar/Carregar (opcional)**
   - Clique em "Salvar maquina (.json)" e escolha se deseja incluir a definicao do programa.
   - Para restaurar uma configuracao, use "Carregar maquina" e selecione o arquivo salvo.
3. **Definir programa**
   - Utilize o construtor visual para adicionar/remover linhas.
   - A representacao textual e atualizada automaticamente.
4. **Computar**
   - Preencha os valores dos registradores de entrada.
   - Clique em **Computar** para executar e acompanhar o log.
   - Os valores finais aparecem na seção de saida.

## Estrutura dos arquivos
- `index.html` – layout principal (definicao da maquina, programa e execucao).
- `style.css` – estilos, incluindo responsividade e modal de salvamento.
- `app.js` – logica da aplicacao (estado da maquina, renderizacoes, execucao e IO local).

