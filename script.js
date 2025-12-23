// ======================================================
// App state
// ======================================================
let units = {};
let currentUnit = null;
let currentAnswers = {};
let selectedBlank = null;

// ======================================================
// DOM ready
// ======================================================
document.addEventListener('DOMContentLoaded', () => {

  // ---------- DOM elements ----------
  
  const unitGrid = document.getElementById('unitGrid');

  const videoTitle = document.getElementById('videoTitle');
  const videoFrame = document.getElementById('videoFrame');

  const scriptTitle = document.getElementById('scriptTitle');
  const scriptBox = document.getElementById('scriptBox');    
  const answerBanks = document.getElementById('answerBanks');

  const practiceTitle = document.getElementById('practiceTitle');
  const practiceScript = document.getElementById('practiceScript');

  const btnConfirm = document.getElementById('btnConfirm');
  const btnScriptBack = document.getElementById('btnScriptBack');
  const btnVideoBackIndex = document.getElementById('btnVideoBackIndex');

  if (btnVideoBackIndex) {
    btnVideoBackIndex.onclick = () => {
      showView('index');
    };
  }

  // ======================================================
  // Load units
  // ======================================================
  async function loadUnits() {
    const res = await fetch('units.json');
    units = await res.json();
    buildUnitGrid();
  }

  function buildUnitGrid() {
    unitGrid.innerHTML = '';
  
    Object.entries(units)
      .sort(([, a], [, b]) => a.order - b.order)
      .forEach(([key, unit]) => {
        const card = document.createElement('div');
        card.className = 'unit-card';
  
        if (unit.type === 'unit') {
          card.innerHTML = `
            <div class="unit-number">Unit ${key}</div>
            <div class="unit-title">${unit.title}</div>
          `;
        } else {
          card.innerHTML = `
            <div class="unit-title">${unit.title}</div>
          `;
        }
  
        card.onclick = () => openUnit(key);
        unitGrid.appendChild(card);
      });
  }

  // ======================================================
  // Navigation helpers
  // ======================================================
  function showView(name) {
    document.querySelectorAll('section')
      .forEach(s => s.classList.add('hidden'));
    document.getElementById(`view-${name}`).classList.remove('hidden');
  }

  function openUnit(unitNumber) {
    currentAnswers = {};
    selectedBlank = null;

    const unit = units[unitNumber];
    currentUnit = unit;

    videoTitle.textContent = unit.title;
    videoFrame.src = unit.youtubeId
      ? `https://www.youtube.com/embed/${unit.youtubeId}`
      : '';

    showView('video');
  }

  function openPresentation(unit) {
    const title = document.getElementById('presentationTitle');
    const instructions = document.getElementById('presentationInstructions');
    const grid = document.getElementById('topicGrid');

    title.textContent = unit.title;
    instructions.textContent = unit.instructions || '';
    grid.innerHTML = '';

    unit.topics.forEach(topic => {
      const card = document.createElement('div');
      card.className = 'unit-card';
      card.innerHTML = `<div class="unit-title">${topic.title}</div>`;

      card.onclick = () => {
        currentUnit = {
          type: 'presentation-topic',
          title: topic.title,
          script: topic.script,
          answerBanks: topic.answerBanks
        };

        scriptTitle.textContent = topic.title;
        practiceTitle.textContent = topic.title;

        generateEditableScript(currentUnit);
        showView('script');
      };

      grid.appendChild(card);
    });

    showView('presentation-topic');
  }



  // ======================================================
  // SCRIPT (editable)
  // ======================================================
  function generateEditableScript(unit) {
    scriptBox.innerHTML = '';

    unit.script.forEach((line, lineIndex) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'conversation-line';

      if (line.speaker === 'You') {
        lineDiv.classList.add('you-line');
      }

      const speaker = document.createElement('span');
      speaker.className = 'speaker';
      speaker.textContent = `${line.speaker}: `;
      lineDiv.appendChild(speaker);

      const regex = /\[([^\]]+)\]/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(line.text)) !== null) {
        if (match.index > lastIndex) {
          lineDiv.appendChild(
            document.createTextNode(line.text.slice(lastIndex, match.index))
          );
        }

        const blankId = `blank-${lineIndex}-${match[1]}`;
        const key = match[1];
        const example =
          unit.examples && unit.examples[key]
            ? unit.examples[key]
            : 'タップして入力';

const blank = createEditableBlank(blankId, example);
        // ⭐ RESTORE PREVIOUS ANSWER ⭐
        if (currentAnswers[blankId]) {
          const input = blank.querySelector('.blank-input');
          input.value = currentAnswers[blankId];
          blank.classList.add('filled');
        }

        lineDiv.appendChild(blank);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.text.length) {
        lineDiv.appendChild(
          document.createTextNode(line.text.slice(lastIndex))
        );
      }

      scriptBox.appendChild(lineDiv);
    });

    generateAnswerBanks(unit.answerBanks);

  }

  // ======================================================
  // SCRIPT (read-only)
  // ======================================================
  function generateReadOnlyScript(unit) {
    practiceScript.innerHTML = '';

    unit.script.forEach((line, lineIndex) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'conversation-line';

      const speaker = document.createElement('span');
      speaker.className = 'speaker';
      speaker.textContent = `${line.speaker}: `;
      lineDiv.appendChild(speaker);

      const regex = /\[([^\]]+)\]/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(line.text)) !== null) {
        if (match.index > lastIndex) {
          lineDiv.appendChild(
            document.createTextNode(line.text.slice(lastIndex, match.index))
          );
        }

        const blankId = `blank-${lineIndex}-${match[1]}`;
        const answer = currentAnswers[blankId] || '___';
        lineDiv.appendChild(createReadOnlyBlank(answer));
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.text.length) {
        lineDiv.appendChild(
          document.createTextNode(line.text.slice(lastIndex))
        );
      }

      practiceScript.appendChild(lineDiv);
    });
  }

  // ======================================================
  // BLANKS
  // ======================================================
  function createEditableBlank(blankId, placeholderText) {
    const blank = document.createElement('span');
    blank.className = 'drop-blank editable';
    blank.dataset.blankId = blankId;

    const input = document.createElement('input');
    input.className = 'blank-input';
    input.placeholder = placeholderText;
    input.disabled = true;
  
    // ⭐ SAVE TYPED INPUT ⭐
    input.addEventListener('input', () => {
      const value = input.value.trim();
  
      if (value) {
        currentAnswers[blankId] = value;
        blank.classList.add('filled');
      } else {
        delete currentAnswers[blankId];
        blank.classList.remove('filled');
      }
    });
  
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = e => {
      e.stopPropagation();
      clearBlank(blank);
    };
  
    blank.append(input, deleteBtn);
    blank.onclick = () => selectBlank(blank);
  
    return blank;
  }

  function selectBlank(blank) {
    document.querySelectorAll('.drop-blank.editable').forEach(b => {
      b.classList.remove('selected');
      b.querySelector('.blank-input').disabled = true;
    });

    selectedBlank = blank;
    blank.classList.add('selected');
    const input = blank.querySelector('.blank-input');
    input.disabled = false;
    input.focus();
  }

  function clearBlank(blank) {
    const input = blank.querySelector('.blank-input');
    input.value = '';
    delete currentAnswers[blank.dataset.blankId];
    blank.classList.remove('filled', 'selected');
    input.disabled = true;
    selectedBlank = null;
  }

  function createReadOnlyBlank(text) {
    const blank = document.createElement('span');
    blank.className = 'drop-blank readonly filled';

    const div = document.createElement('div');
    div.className = 'answer-display';
    div.textContent = text;

    blank.appendChild(div);
    return blank;
  }

  // ======================================================
  // ANSWER BANKS
  // ======================================================
  function generateAnswerBanks(banks) {
    answerBanks.innerHTML =
      `<p class="answer-tip">答えをえらぶか自分の答えをタイピングしよう</p>`;

    Object.entries(banks).forEach(([type, answers]) => {
      const group = document.createElement('div');
      group.className = 'answer-group';

      const header = document.createElement('div');
      header.className = 'group-header';
      header.innerHTML = `
        <div class="answer-title">${type}</div>
        <button class="toggle-btn">▼</button>
      `;

      const list = document.createElement('div');
      list.className = 'answer-list';
      list.style.display = 'none';

      answers.forEach(answer => {
        const card = document.createElement('div');
        card.className = 'answer-card';
      
        // Normalize answer (string or object)
        const text = typeof answer === 'string' ? answer : answer.text;
        const imgSrc = typeof answer === 'object' ? answer.img : null;
      
        // Optional image
        if (imgSrc) {
          const img = document.createElement('img');
          img.src = imgSrc;
          img.alt = text;
          img.className = 'answer-image';
          card.appendChild(img);
        }
      
        // Text label
        const label = document.createElement('div');
        label.className = 'answer-word';
        label.textContent = text;
        card.appendChild(label);
      
        card.onclick = () => fillSelectedBlank(text);
        list.appendChild(card);
      });
      

      header.onclick = () => {
        const open = list.style.display === 'flex';
        list.style.display = open ? 'none' : 'flex';
        header.querySelector('.toggle-btn').textContent = open ? '▼' : '▲';
      };

      group.append(header, list);
      answerBanks.appendChild(group);
    });
  }

  function fillSelectedBlank(text) {
    if (!selectedBlank) return;
  
    const input = selectedBlank.querySelector('.blank-input');
  
    // ✅ Always replace the value
    input.value = text;
    currentAnswers[selectedBlank.dataset.blankId] = text;
    selectedBlank.classList.add('filled');
  
    // ✅ KEEP the blank selected and editable
    input.focus();
  }  

  // ======================================================
  // CONFIRM
  // ======================================================
  btnConfirm.onclick = () => {
    generateReadOnlyScript(currentUnit);
    showView('practice');
  };


  // ======================================================
  // NAV BUTTONS
  // ======================================================
  document.getElementById('btnVideoNext').onclick = () => {
    if (currentUnit.type === 'presentation') {
      openPresentation(currentUnit);
      return;
    }

    scriptTitle.textContent = currentUnit.title;
    practiceTitle.textContent = currentUnit.title;

    generateEditableScript(currentUnit);
    showView('script');
  };
  
  if (btnScriptBack) {
    btnScriptBack.onclick = () => {
      if (currentUnit.type === 'presentation-topic') {
        showView('presentation-topic');
        return;
      }
      showView('video');
    };
  }

  document.getElementById('btnTopicBackIndex').onclick = () => {
    showView('video');
  };

  document.getElementById('btnPracticeBackScript').onclick = () => {
    selectedBlank = null;
    generateEditableScript(currentUnit); // ⭐ answers restored
    showView('script');
  };
  
  document.getElementById('btnPracticeBackIndex').onclick = () => showView('index');

  // ======================================================
  // INIT
  // ======================================================
  loadUnits();
});
