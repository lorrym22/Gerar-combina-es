const selectedNumbers = new Set()
let allCombinations = []
let currentPage = 1
const itemsPerPage = 1000
let filteredCombinations = []
const xPosicoes = [1, 5, 7, 9, 13, 17, 19, 21, 25] // Números no "X"
const cruzPosicoes = [3, 8, 13, 18, 23, 11, 12, 14, 15] // Números na "Cruz"
const molduraPosicoes = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25] // Exemplo para "Moldura"
const centroPosicoes = [7, 8, 9, 12, 13, 14, 17, 18, 19] // Número central

// Variável para armazenar o temporizador da mensagem de erro
let errorMessageTimer

// Web Worker para processamento em segundo plano
const worker = new Worker(
  URL.createObjectURL(
    new Blob(
      [
        `
    self.onmessage = function(e) {
        const { selectedArray, combinationSize } = e.data;
        const combinations = getCombinations(selectedArray, combinationSize);
        self.postMessage(combinations);
    };

    function getCombinations(arr, size) {
        const result = [];
        const total = Math.pow(arr.length, size);
        const backtrack = (start, current) => {
            if (current.length === size) {
                result.push([...current].sort((a, b) => a - b));
                if (result.length % 1000 === 0) {
                    const progress = Math.round((result.length / total) * 100);
                    self.postMessage({ progress });
                }
                return;
            }
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        };
        backtrack(0, []);
        return result.sort((a, b) => {
            for (let i = 0; i < size; i++) {
                if (a[i] !== b[i]) return a[i] - b[i];
            }
            return 0;
        });
    }
`,
      ],
      { type: "text/javascript" },
    ),
  ),
)

function createNumberGrid() {
  const grid = document.getElementById("numberGrid")
  for (let i = 1; i <= 25; i++) {
    const button = document.createElement("div")
    button.className = "number-button"
    button.textContent = i
    button.onclick = () => toggleNumber(i, button)
    grid.appendChild(button)
  }
}

function hideErrorMessage() {
  document.getElementById("selectionError").style.display = "none"
  // Limpar o temporizador existente se houver
  if (errorMessageTimer) {
    clearTimeout(errorMessageTimer)
    errorMessageTimer = null
  }
}

function showErrorMessage() {
  const errorMessage = document.getElementById("selectionError")
  errorMessage.style.display = "block"

  // Limpar o temporizador existente se houver
  if (errorMessageTimer) {
    clearTimeout(errorMessageTimer)
  }

  // Configurar um novo temporizador para ocultar a mensagem após 3 segundos
  errorMessageTimer = setTimeout(() => {
    errorMessage.style.display = "none"
    errorMessageTimer = null
  }, 3000)
}

function toggleNumber(number, button) {
  if (selectedNumbers.has(number)) {
    selectedNumbers.delete(number)
    button.classList.remove("selected")
  } else {
    selectedNumbers.add(number)
    button.classList.add("selected")
    hideErrorMessage()
  }
  updateSelectedCount()
}

function updateSelectedCount() {
  const countElement = document.getElementById("selectedCount")
  const container = document.getElementById("selectedNumbersContainer")
  countElement.textContent = selectedNumbers.size
  if (selectedNumbers.size > 0) {
    container.style.display = "block"
  } else {
    container.style.display = "none"
  }
}

function generateCombinations() {
  const combinationSize = Number.parseInt(document.getElementById("combinationSize").value)
  const requiredNumbers = document.getElementById("requiredNumbers")

  if (selectedNumbers.size < combinationSize) {
    requiredNumbers.textContent = combinationSize
    showErrorMessage() // Usar a nova função que inclui o temporizador
    return
  }
  hideErrorMessage()

  // Show column names
  showColumnNames()

  const tbody = document.getElementById("combinationsBody")
  tbody.innerHTML = ""
  const loaderContainer = document.getElementById("loaderContainer")
  loaderContainer.style.display = "flex" // Show loader immediately
  document.getElementById("loaderText").textContent = "Iniciando geração de combinações..."

  const selectedArray = Array.from(selectedNumbers)

  worker.postMessage({ selectedArray, combinationSize })
  worker.onmessage = (e) => {
    if (e.data.progress) {
      document.getElementById("loaderText").textContent = `Gerando combinações: ${e.data.progress}%`
    } else {
      allCombinations = e.data
      document.getElementById("combinationCount").textContent = allCombinations.length.toLocaleString("pt-BR")
      document.getElementById("totalCombinationsContainer").style.display = "block"
      processCombinationsInBatches(allCombinations)
    }
  }
}

function processCombinationsInBatches(combinations) {
  allCombinations = combinations
  filteredCombinations = combinations
  currentPage = 1
  displayCombinations()
  document.getElementById("loaderContainer").style.display = "none"
  updateFilteredCount(combinations.length)
  applyFilters()
  updateScrollButtonsVisibility()
}

function contarLinhasEColunas(numeros) {
  const linhas = [0, 0, 0, 0, 0] // 5 linhas
  const colunas = [0, 0, 0, 0, 0] // 5 colunas

  numeros.forEach((num) => {
    if (num <= 5) linhas[0]++
    else if (num <= 10) linhas[1]++
    else if (num <= 15) linhas[2]++
    else if (num <= 20) linhas[3]++
    else linhas[4]++ // Linhas 1-5,6-10, etc.

    const coluna = (num - 1) % 5 // Colunas 1-5
    colunas[coluna]++
  })

  return {
    linhas: linhas.join(","),
    colunas: colunas.join(","),
  }
}

function formatNumber(num) {
  return num < 10 ? `0${num}` : `${num}`
}

function clearAll() {
  selectedNumbers.clear()
  document.querySelectorAll(".number-button").forEach((button) => {
    button.classList.remove("selected")
  })
  document.getElementById("combinationSize").value = 6
  document.getElementById("combinationCount").textContent = "0"
  document.getElementById("combinationsBody").innerHTML = ""
  document.getElementById("totalCombinationsContainer").style.display = "none"
  updateSelectedCount()

  // Reset filter inputs
  document.querySelectorAll(".filter-item input").forEach((input) => {
    input.value = ""
  })
  applyFilters()

  // Hide column names
  hideColumnNames()

  // Hide filtered combinations count
  document.getElementById("filteredCombinationsCount").style.display = "none"
  hideErrorMessage()
  document.getElementById("selectedCombinationInfo").style.display = "none"
  document.getElementById("selectedCombinationDetails").innerHTML = ""
  document.getElementById("combinationPosition").value = ""
  document.getElementById("positionError").style.display = "none"
  allCombinations = []

  // Hide progress bar
  document.getElementById("loaderContainer").style.display = "none"
  document.getElementById("specificCombination").value = ""
  document.getElementById("specificCombinationInfo").style.display = "none"
  document.getElementById("specificCombinationDetails").innerHTML = ""
  document.getElementById("specificCombinationError").style.display = "none"

  // Remove filtered column styling
  document.querySelectorAll("#combinationsTable th").forEach((th) => {
    th.classList.remove("filtered-column")
  })
  currentPage = 1
  filteredCombinations = []
  updatePaginationControls()
  updateFilteredCount(0) // Added to clear filtered count on clear
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const applyFilters = debounce(() => {
  const filters = {
    pares: Number.parseInt(document.getElementById("paresInput").value) || 0,
    impares: Number.parseInt(document.getElementById("imparesInput").value) || 0,
    primos: Number.parseInt(document.getElementById("primosInput").value) || 0,
    fibonacci: Number.parseInt(document.getElementById("fibonacciInput").value) || 0,
    sequenciais: Number.parseInt(document.getElementById("sequenciaisInput").value) || 0,
    multiplos3: Number.parseInt(document.getElementById("multiplos3Input").value) || 0,
    triangulares: Number.parseInt(document.getElementById("triangularesInput").value) || 0,
    moldura: Number.parseInt(document.getElementById("molduraInput").value) || 0,
    centro: Number.parseInt(document.getElementById("centroInput").value) || 0,
    soma: Number.parseInt(document.getElementById("somaInput").value) || 0,
    numerosX: Number.parseInt(document.getElementById("numerosXInput").value) || 0,
    numerosCruz: Number.parseInt(document.getElementById("numerosCruzInput").value) || 0,
    linhas: document.getElementById("linhasInput").value || "",
    colunas: document.getElementById("colunasInput").value || "",
    menores10: Number.parseInt(document.getElementById("menores10Input").value) || 0,
    maiores10: Number.parseInt(document.getElementById("maiores10Input").value) || 0,
  }

  const loaderContainer = document.getElementById("loaderContainer")
  loaderContainer.style.display = "flex" // Show loader immediately
  document.getElementById("loaderText").textContent = "Aplicando filtros..."

  setTimeout(() => {
    let processedCount = 0
    filteredCombinations = allCombinations.filter((combination) => {
      const details = getCombinationDetails(combination)
      processedCount++

      return (
        (filters.pares === 0 || filters.pares === details.pares) &&
        (filters.impares === 0 || filters.impares === details.impares) &&
        (filters.primos === 0 || filters.primos === details.primos) &&
        (filters.fibonacci === 0 || filters.fibonacci === details.fibonacci) &&
        (filters.sequenciais === 0 || filters.sequenciais === details.sequenciais) &&
        (filters.multiplos3 === 0 || filters.multiplos3 === details.multiplos3) &&
        (filters.triangulares === 0 || filters.triangulares === details.triangulares) &&
        (filters.moldura === 0 || filters.moldura === details.moldura) &&
        (filters.centro === 0 || filters.centro === details.centro) &&
        (filters.soma === 0 || filters.soma === details.soma) &&
        (filters.numerosX === 0 || filters.numerosX === details.numerosX) &&
        (filters.numerosCruz === 0 || filters.numerosCruz === details.numerosCruz) &&
        (filters.linhas === "" || filters.linhas === details.linhas) &&
        (filters.colunas === "" || filters.colunas === details.colunas) &&
        (filters.menores10 === 0 || filters.menores10 === details.menores10) &&
        (filters.maiores10 === 0 || filters.maiores10 === details.maiores10)
      )
    })

    currentPage = 1
    updateFilteredCount(filteredCombinations.length)
    displayCombinations()
    document.getElementById("loaderText").textContent = "Filtros aplicados"
    setTimeout(() => {
      document.getElementById("loaderContainer").style.display = "none"
    }, 1000)
  }, 0)
}, 250)

function displayCombinations() {
  const tbody = document.getElementById("combinationsBody")
  tbody.innerHTML = ""

  const start = (currentPage - 1) * itemsPerPage
  const end = Math.min(start + itemsPerPage, filteredCombinations.length)

  for (let i = start; i < end; i++) {
    const combination = filteredCombinations[i]
    const details = getCombinationDetails(combination)
    const row = document.createElement("tr")

    row.innerHTML = `
            <td>${(i + 1).toLocaleString("pt-BR")}ª</td>
            <td><span class="no-wrap">${combination.map(formatNumber).join(", ")}</span></td>
            <td>${details.pares}</td>
            <td>${details.impares}</td>
            <td>${details.primos}</td>
            <td>${details.fibonacci}</td>
            <td>${details.sequenciais}</td>
            <td>${details.multiplos3}</td>
            <td>${details.triangulares}</td>
            <td>${details.moldura}</td>
            <td>${details.centro}</td>
            <td>${details.soma}</td>
            <td>${details.numerosX}</td>
            <td>${details.numerosCruz}</td>
            <td>${details.linhas}</td>
            <td>${details.colunas}</td>
            <td>${details.menores10}</td>
            <td>${details.maiores10}</td>
        `

    tbody.appendChild(row)
  }

  updatePaginationControls()
  updateScrollButtonsVisibility()
}

function updatePaginationControls() {
  const totalPages = Math.ceil(filteredCombinations.length / itemsPerPage)
  const paginationContainer = document.getElementById("paginationContainer")
  paginationContainer.innerHTML = ""

  if (totalPages > 1) {
    const prevButton = document.createElement("button")
    prevButton.textContent = "Anterior"
    prevButton.onclick = () => {
      if (currentPage > 1) {
        currentPage--
        displayCombinations()
      }
    }
    paginationContainer.appendChild(prevButton)

    const pageInfo = document.createElement("span")
    pageInfo.textContent = `Página ${currentPage.toLocaleString("pt-BR")} de ${totalPages.toLocaleString("pt-BR")}`
    paginationContainer.appendChild(pageInfo)

    const nextButton = document.createElement("button")
    nextButton.textContent = "Próxima"
    nextButton.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++
        displayCombinations()
      }
    }
    paginationContainer.appendChild(nextButton)
  }
}

function toggleDarkMode(isDark) {
  const body = document.body
  if (isDark) {
    body.classList.add("dark-mode")
  } else {
    body.classList.remove("dark-mode")
  }
  localStorage.setItem("darkMode", isDark)
}

const darkModeToggle = document.querySelector("#checkbox")
darkModeToggle.addEventListener("change", (e) => {
  toggleDarkMode(e.target.checked)
})

// Check for saved user preference, if any, on load of the website
const darkModeSaved = localStorage.getItem("darkMode")

if (darkModeSaved === "true") {
  darkModeToggle.checked = true
  toggleDarkMode(true)
}

createNumberGrid()
updateSelectedCount()

document.querySelectorAll(".filter-item input").forEach((input) => {
  input.addEventListener("input", applyFilters)
})

function toggleFilters() {
  const filterToggle = document.querySelector(".filter-toggle")
  const filterGrid = document.querySelector(".filter-grid")
  const isCollapsed = filterToggle.classList.toggle("collapsed")
  filterGrid.classList.toggle("collapsed")
  localStorage.setItem("filtersCollapsed", isCollapsed)
}

function initializeFilterState() {
  const filterToggle = document.querySelector(".filter-toggle")
  const filterGrid = document.querySelector(".filter-grid")
  const isCollapsed = localStorage.getItem("filtersCollapsed") === "true"
  if (isCollapsed) {
    filterToggle.classList.add("collapsed")
    filterGrid.classList.add("collapsed")
  }
}

function updateRequiredNumbers() {
  const combinationSize = Number.parseInt(document.getElementById("combinationSize").value)
  document.getElementById("requiredNumbers").textContent = combinationSize
}

function getCombinationByPosition() {
  const button = document.querySelector("button.action-button")
  button.textContent = "Buscando..."
  button.disabled = true

  setTimeout(() => {
    const position = Number.parseInt(document.getElementById("combinationPosition").value)
    const errorElement = document.getElementById("positionError")
    const detailsElement = document.getElementById("selectedCombinationInfo")

    if (isNaN(position) || position < 1 || position > allCombinations.length) {
      errorElement.textContent = `Por favor, insira um número entre 1 e ${allCombinations.length.toLocaleString("pt-BR")}.`
      errorElement.style.display = "block"
      detailsElement.style.display = "none"
    } else {
      errorElement.style.display = "none"
      const combination = allCombinations[position - 1]
      const details = getCombinationDetails(combination)

      const detailsContentElement = document.getElementById("selectedCombinationDetails")
      detailsContentElement.innerHTML = `
                <td>${combination.map(formatNumber).join(", ")}</td>
                <td>${position.toLocaleString("pt-BR")}ª</td>
                <td>${details.pares}</td>
                <td>${details.impares}</td>
                <td>${details.primos}</td>
                <td>${details.fibonacci}</td>
                <td>${details.sequenciais}</td>
                <td>${details.multiplos3}</td>
                <td>${details.triangulares}</td>
                <td>${details.moldura}</td>
                <td>${details.centro}</td>
                <td>${details.soma}</td>
                <td>${details.numerosX}</td>
                <td>${details.numerosCruz}</td>
                <td>${details.linhas}</td>
                <td>${details.colunas}</td>
                <td>${details.menores10}</td>
                <td>${details.maiores10}</td>
            `

      detailsElement.style.display = "block"
    }

    button.textContent = "Buscar"
    button.disabled = false
  }, 500)
}

function getCombinationDetails(combination) {
  const isPrime = (n) => n > 1 && ![...Array(n).keys()].slice(2).some((i) => n % i === 0)
  const fibonacci = [1, 2, 3, 5, 8, 13, 21]
  const triangular = [1, 3, 6, 10, 15, 21]
  const { linhas, colunas } = contarLinhasEColunas(combination)

  return {
    pares: combination.filter((n) => n % 2 === 0).length,
    impares: combination.filter((n) => n % 2 !== 0).length,
    primos: combination.filter(isPrime).length,
    fibonacci: combination.filter((n) => fibonacci.includes(n)).length,
    sequenciais: contarSequenciais(combination),
    multiplos3: combination.filter((n) => n % 3 === 0).length,
    triangulares: combination.filter((n) => triangular.includes(n)).length,
    moldura: combination.filter((n) => molduraPosicoes.includes(n)).length,
    centro: combination.filter((n) => centroPosicoes.includes(n)).length,
    soma: combination.reduce((a, b) => a + b, 0),
    numerosX: combination.filter((n) => xPosicoes.includes(n)).length,
    numerosCruz: combination.filter((n) => cruzPosicoes.includes(n)).length,
    linhas: linhas,
    colunas: colunas,
    menores10: combination.filter((n) => n < 10).length,
    maiores10: combination.filter((n) => n > 10).length,
  }
}

function contarSequenciais(combination) {
  let maxSequencia = 0
  let sequenciaAtual = 1

  combination.sort((a, b) => a - b) // Ordena a combinação

  for (let i = 1; i < combination.length; i++) {
    if (combination[i] === combination[i - 1] + 1) {
      sequenciaAtual++
    } else {
      maxSequencia = Math.max(maxSequencia, sequenciaAtual)
      sequenciaAtual = 1
    }
  }

  return Math.max(maxSequencia, sequenciaAtual)
}

initializeFilterState()
updateRequiredNumbers()
document.getElementById("combinationSize").addEventListener("input", updateRequiredNumbers)
document.getElementById("combinationSize").addEventListener("input", hideErrorMessage)
document.getElementById("combinationPosition").addEventListener("input", function () {
  if (this.value === "") {
    document.getElementById("selectedCombinationInfo").style.display = "none"
    document.getElementById("positionError").style.display = "none"
  }
})

function getSpecificCombinationInfo() {
  const button = document.querySelectorAll("button.action-button")[1]
  button.textContent = "Buscando..."
  button.disabled = true

  setTimeout(() => {
    const input = document.getElementById("specificCombination").value
    const errorElement = document.getElementById("specificCombinationError")
    const infoElement = document.getElementById("specificCombinationInfo")

    if (input.trim() === "") {
      errorElement.style.display = "none"
      infoElement.style.display = "none"
    } else {
      const combination = input.split(",").map((num) => Number.parseInt(num.trim()))
      const combinationSize = Number.parseInt(document.getElementById("combinationSize").value)

      if (combination.length !== combinationSize || combination.some(isNaN)) {
        errorElement.textContent = `Por favor, insira ${combinationSize} números válidos separados por vírgula.`
        errorElement.style.display = "block"
        infoElement.style.display = "none"
      } else {
        errorElement.style.display = "none"
        const details = getCombinationDetails(combination)
        const position = findCombinationPosition(combination)

        const detailsContentElement = document.getElementById("specificCombinationDetails")
        detailsContentElement.innerHTML = `
                    <td>${combination.map(formatNumber).join(", ")}</td>
                    <td>${position !== -1 ? `${(position + 1).toLocaleString("pt-BR")}ª` : "Não encontrada"}</td>
                    <td>${details.pares}</td>
                    <td>${details.impares}</td>
                    <td>${details.primos}</td>
                    <td>${details.fibonacci}</td>
                    <td>${details.sequenciais}</td>
                    <td>${details.multiplos3}</td>
                    <td>${details.triangulares}</td>
                    <td>${details.moldura}</td>
                    <td>${details.centro}</td>
                    <td>${details.soma}</td>
                    <td>${details.numerosX}</td>
                    <td>${details.numerosCruz}</td>
                    <td>${details.linhas}</td>
                    <td>${details.colunas}</td>
                    <td>${details.menores10}</td>
                    <td>${details.maiores10}</td>
                `

        infoElement.style.display = "block"
      }
    }

    button.textContent = "Buscar Info"
    button.disabled = false
  }, 500) // Simula um breve delay para feedback visual
}

function findCombinationPosition(combination) {
  return allCombinations.findIndex(
    (comb) => comb.length === combination.length && comb.every((num, index) => num === combination[index]),
  )
}

function checkSpecificCombinationInput() {
  const input = document.getElementById("specificCombination").value
  if (input.trim() === "") {
    document.getElementById("specificCombinationInfo").style.display = "none"
  }
}

/* global XLSX */
function downloadXLSX() {
  if (allCombinations.length === 0) {
    alert("Não há combinações para baixar. Gere as combinações primeiro.")
    return
  }

  const ws = XLSX.utils.json_to_sheet(
    allCombinations.map((comb, index) => ({
      Posição: `${(index + 1).toLocaleString("pt-BR")}ª`,
      Combinação: comb.join(", "),
      Pares: comb.filter((n) => n % 2 === 0).length,
      Ímpares: comb.filter((n) => n % 2 !== 0).length,
      Primos: comb.filter((n) => n > 1 && ![...Array(n).keys()].slice(2).some((i) => n % i === 0)).length,
      Fibonacci: comb.filter((n) => [1, 2, 3, 5, 8, 13, 21].includes(n)).length,
      Sequenciais: contarSequenciais(comb),
      "Múltiplos de 3": comb.filter((n) => n % 3 === 0).length,
      Triangulares: comb.filter((n) => [1, 3, 6, 10, 15, 21].includes(n)).length,
      Moldura: comb.filter((n) => molduraPosicoes.includes(n)).length,
      Centro: comb.filter((n) => centroPosicoes.includes(n)).length,
      Soma: comb.reduce((a, b) => a + b, 0),
      "Números no X": comb.filter((n) => xPosicoes.includes(n)).length,
      "Números na Cruz": comb.filter((n) => cruzPosicoes.includes(n)).length,
      Linhas: contarLinhasEColunas(comb).linhas,
      Colunas: contarLinhasEColunas(comb).colunas,
      "Menores que 10": comb.filter((n) => n < 10).length,
      "Maiores que 10": comb.filter((n) => n > 10).length,
    })),
  )

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Combinações")
  XLSX.writeFile(wb, "combinacoes.xlsx")
}

function validateLinhasColunasInput(input) {
  const regex = /^(\d,){4}\d$/
  if (!regex.test(input.value)) {
    input.setCustomValidity("Por favor, insira exatamente 5 números separados por vírgula (ex: 1,2,3,4,5)")
  } else {
    input.setCustomValidity("")
  }
}

document.getElementById("linhasInput").addEventListener("input", function () {
  validateLinhasColunasInput(this)
})

document.getElementById("colunasInput").addEventListener("input", function () {
  validateLinhasColunasInput(this)
})

function showColumnNames() {
  const headerRow = document.querySelector("#combinationsTable thead tr")
  if (headerRow) {
    headerRow.querySelectorAll("th").forEach((th) => {
      th.style.display = ""
    })
  }
}

function hideColumnNames() {
  const headerRow = document.querySelector("#combinationsTable thead tr")
  if (headerRow) {
    headerRow.querySelectorAll("th:not(:first-child):not(:nth-child(2))").forEach((th) => {
      th.style.display = "none"
    })
  }
}

function scrollToTop() {
  const container = document.querySelector(".table-container")
  container.scrollTo({
    top: 0,
    behavior: "smooth",
  })
}

function scrollToBottom() {
  const container = document.querySelector(".table-container")
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth",
  })
}

function updateScrollButtonsVisibility() {
  const container = document.querySelector(".table-container")
  const scrollButtons = document.querySelector(".scroll-buttons")
  const scrollThreshold = 100 // pixels from top/bottom to show/hide buttons

  if (
    container.scrollTop > scrollThreshold &&
    container.scrollHeight - container.scrollTop - container.clientHeight > scrollThreshold
  ) {
    scrollButtons.style.opacity = "1"
  } else {
    scrollButtons.style.opacity = "0"
  }

  // Atualiza a posição horizontal dos botões
  const containerRect = container.getBoundingClientRect()
  const rightEdge = containerRect.right
  scrollButtons.style.right = `${window.innerWidth - rightEdge + 20}px`
}

window.addEventListener("resize", updateScrollButtonsVisibility)
document.querySelector(".table-container").addEventListener("scroll", updateScrollButtonsVisibility)

function updateFilteredCount(count) {
  const filteredCountElement = document.getElementById("filteredCombinationsCount")

  if (count > 0) {
    filteredCountElement.style.display = "block"
    filteredCountElement.textContent = `${count.toLocaleString("pt-BR")} combinações filtradas`
    filteredCountElement.className = "" // Remove a classe se existir
  } else {
    filteredCountElement.style.display = "block"
    filteredCountElement.textContent = "⚠️ Nenhuma combinação foi encontrada."
    filteredCountElement.className = "no-combinations-message"
  }
}
