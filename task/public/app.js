const API_BASE = 'http://localhost:3000/api';

// DOM Elements
const addStudentForm = document.getElementById('addStudentForm');
const refreshBtn = document.getElementById('refreshBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const studentsTableBody = document.getElementById('studentsTableBody');
const totalStudentsEl = document.getElementById('totalStudents');
const averageAgeEl = document.getElementById('averageAge');
const backupStatusEl = document.getElementById('backupStatus');
const startBackupBtn = document.getElementById('startBackupBtn');
const stopBackupBtn = document.getElementById('stopBackupBtn');
const statusBackupBtn = document.getElementById('statusBackupBtn');
const message = document.getElementById('message');
const groupFilter = document.getElementById('groupFilter');
const filterBtn = document.getElementById('filterBtn');
const groupTable = document.getElementById('groupTable');
const groupTableBody = document.getElementById('groupTableBody');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeBtn = document.querySelector('.close');

// Event Listeners
addStudentForm.addEventListener('submit', handleAddStudent);
refreshBtn.addEventListener('click', loadStudents);
saveBtn.addEventListener('click', handleSaveStudents);
loadBtn.addEventListener('click', handleLoadStudents);
startBackupBtn.addEventListener('click', handleStartBackup);
stopBackupBtn.addEventListener('click', handleStopBackup);
statusBackupBtn.addEventListener('click', handleBackupStatus);
filterBtn.addEventListener('click', handleFilterByGroup);
editForm.addEventListener('submit', handleEditStudent);
closeBtn.addEventListener('click', closeEditModal);
window.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStudents();
  updateBackupStatus();
  setInterval(updateBackupStatus, 5000);
  setInterval(loadStudents, 10000);
});

// API Call Function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }

    return data;
  } catch (error) {
    showMessage(error.message, 'error');
    throw error;
  }
}

// Load Students
async function loadStudents() {
  try {
    const response = await apiCall('/students');
    const students = response.data || [];

    if (students.length === 0) {
      studentsTableBody.innerHTML = '';
    } else {
      studentsTableBody.innerHTML = students
        .map(student => `
          <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.age}</td>
            <td>${student.group}</td>
            <td>
              <button class="edit-btn" onclick="openEditModal('${student.id}', '${student.name}', ${student.age}, ${student.group})">Редактировать</button>
              <button class="delete-btn" onclick="deleteStudent('${student.id}')">Удалить</button>
            </td>
          </tr>
        `)
        .join('');
    }

    updateStats();
  } catch (error) {
    console.error('Failed to load students:', error);
  }
}

// Add Student
async function handleAddStudent(e) {
  e.preventDefault();

  const name = document.getElementById('studentName').value.trim();
  const age = parseInt(document.getElementById('studentAge').value);
  const group = parseInt(document.getElementById('studentGroup').value);

  if (!name || isNaN(age) || isNaN(group)) {
    showMessage('Заполните все поля', 'error');
    return;
  }

  try {
    await apiCall('/students', {
      method: 'POST',
      body: JSON.stringify({ name, age, group })
    });

    showMessage('Студент добавлен!', 'success');
    addStudentForm.reset();
    await loadStudents();
  } catch (error) {
    console.error('Failed to add student:', error);
  }
}

// Delete Student
async function deleteStudent(id) {
  if (!confirm('Вы уверены?')) return;

  try {
    await apiCall(`/students/${id}`, { method: 'DELETE' });
    showMessage('Студент удален!', 'success');
    await loadStudents();
  } catch (error) {
    console.error('Failed to delete student:', error);
  }
}

// Edit Modal Functions
function openEditModal(id, name, age, group) {
  document.getElementById('editStudentId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editAge').value = age;
  document.getElementById('editGroup').value = group;
  editModal.classList.add('show');
}

function closeEditModal() {
  editModal.classList.remove('show');
}

async function handleEditStudent(e) {
  e.preventDefault();

  const id = document.getElementById('editStudentId').value;
  const name = document.getElementById('editName').value.trim();
  const age = parseInt(document.getElementById('editAge').value);
  const group = parseInt(document.getElementById('editGroup').value);

  try {
    await apiCall(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, age, group })
    });

    showMessage('Студент обновлен!', 'success');
    closeEditModal();
    await loadStudents();
  } catch (error) {
    console.error('Failed to update student:', error);
  }
}

// Update Stats
async function updateStats() {
  try {
    const allStudentsResponse = await apiCall('/students');
    const students = allStudentsResponse.data || [];

    totalStudentsEl.textContent = students.length;

    if (students.length > 0) {
      const avgResponse = await apiCall('/average-age');
      averageAgeEl.textContent = avgResponse.data.average.toFixed(2);
    } else {
      averageAgeEl.textContent = '0';
    }
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

// Save/Load Functions
async function handleSaveStudents() {
  try {
    await apiCall('/students/save', { method: 'POST' });
    showMessage('Сохранено в JSON!', 'success');
  } catch (error) {
    console.error('Failed to save:', error);
  }
}

async function handleLoadStudents() {
  try {
    await apiCall('/students/load', { method: 'POST' });
    showMessage('Загружено из JSON!', 'success');
    await loadStudents();
  } catch (error) {
    console.error('Failed to load:', error);
  }
}

// Backup Functions
async function handleStartBackup() {
  try {
    await apiCall('/backup/start', {
      method: 'POST',
      body: JSON.stringify({ intervalMs: 5000 })
    });

    showMessage('Резервная копия запущена!', 'success');
    startBackupBtn.disabled = true;
    stopBackupBtn.disabled = false;
    updateBackupStatus();
  } catch (error) {
    console.error('Failed to start backup:', error);
  }
}

async function handleStopBackup() {
  try {
    await apiCall('/backup/stop', { method: 'POST' });
    showMessage('Резервная копия остановлена!', 'success');
    startBackupBtn.disabled = false;
    stopBackupBtn.disabled = true;
    updateBackupStatus();
  } catch (error) {
    console.error('Failed to stop backup:', error);
  }
}

async function handleBackupStatus() {
  try {
    const response = await apiCall('/backup/status');
    const status = response.data.status;
    showMessage(`Статус: ${status === 'running' ? 'Работает' : 'Остановлена'}`, 'info');
    updateBackupStatus();
  } catch (error) {
    console.error('Failed to get backup status:', error);
  }
}

async function updateBackupStatus() {
  try {
    const response = await apiCall('/backup/status');
    const isRunning = response.data.isRunning;

    if (isRunning) {
      backupStatusEl.textContent = 'Работает';
      startBackupBtn.disabled = true;
      stopBackupBtn.disabled = false;
    } else {
      backupStatusEl.textContent = 'Остановлена';
      startBackupBtn.disabled = false;
      stopBackupBtn.disabled = true;
    }
  } catch (error) {
    console.error('Failed to update backup status:', error);
  }
}

// Filter by Group
async function handleFilterByGroup() {
  const groupId = parseInt(groupFilter.value);

  if (isNaN(groupId)) {
    showMessage('Введите номер группы', 'error');
    return;
  }

  try {
    const response = await apiCall(`/students/group/${groupId}`);
    const students = response.data || [];

    if (students.length === 0) {
      groupTable.style.display = 'none';
      showMessage('Студентов в этой группе нет', 'info');
    } else {
      groupTable.style.display = 'table';
      groupTableBody.innerHTML = students
        .map(student => `
          <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.age}</td>
            <td>${student.group}</td>
          </tr>
        `)
        .join('');
    }
  } catch (error) {
    console.error('Failed to filter students:', error);
  }
}

// Show Message
function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
  message.style.display = 'block';

  setTimeout(() => {
    message.style.display = 'none';
  }, 3000);
}