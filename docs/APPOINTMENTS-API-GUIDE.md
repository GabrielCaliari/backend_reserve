# Guia de Integração - Sistema de Agendamentos

## Visão Geral

O sistema de agendamentos permite que você:
1. **No Painel Admin**: Configure horários, capacidade, bloqueios e gerencie agendamentos
2. **No Site Público**: Consulte horários disponíveis e envie leads com agendamento

---

## 🔐 Autenticação

### Painel Admin
- **Método**: JWT Bearer Token
- **Header**: `Authorization: Bearer {seu-jwt-token}`
- **Permissões**: 
  - `viewer` - Pode visualizar configurações e agendamentos
  - `editor` - Pode criar/editar configurações e gerenciar agendamentos

### Site Público
- **Método**: Tenant Key
- **Header**: `X-Tenant-Key: {sua-secret-key}`
- **Onde pegar**: No painel admin, em Lead Collections

---

## 📋 PARTE 1: PAINEL ADMIN

### 1.1 Configurar Horários de Atendimento

**Endpoint**: `PUT /api/admin/appointments/schedule-config`

**Headers**:
```
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body**:
```json
{
  "workingDays": [1, 2, 3, 4, 5],  // 0=Domingo, 1=Segunda, ..., 6=Sábado
  "workStartTime": "09:00",
  "workEndTime": "17:00",
  "slotIntervalMinutes": 30,       // Intervalo entre slots (5-480 minutos)
  "capacityPerSlot": 2,             // Quantas pessoas por horário
  "lunchStartTime": "12:00",        // Opcional
  "lunchEndTime": "13:00"           // Opcional
}
```

**Exemplo de Resposta**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "cm123abc",
    "workingDays": [1, 2, 3, 4, 5],
    "workStartTime": "09:00",
    "workEndTime": "17:00",
    "slotIntervalMinutes": 30,
    "capacityPerSlot": 2,
    "lunchStartTime": "12:00",
    "lunchEndTime": "13:00",
    "createdAt": "2026-04-15T10:00:00Z",
    "updatedAt": "2026-04-15T10:00:00Z"
  },
  "status": 200
}
```

**Exemplo React/Next.js**:
```typescript
// Salvar configuração de horários
async function saveScheduleConfig(config: ScheduleConfig) {
  const response = await fetch('/api/admin/appointments/schedule-config', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getJwtToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

---

### 1.2 Buscar Configuração Atual

**Endpoint**: `GET /api/admin/appointments/schedule-config`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

**Exemplo de Resposta**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "workingDays": [1, 2, 3, 4, 5],
    "workStartTime": "09:00",
    "workEndTime": "17:00",
    "slotIntervalMinutes": 30,
    "capacityPerSlot": 2,
    "lunchStartTime": "12:00",
    "lunchEndTime": "13:00"
  },
  "status": 200
}
```

**Exemplo React/Next.js**:
```typescript
// Buscar configuração atual
async function getScheduleConfig() {
  const response = await fetch('/api/admin/appointments/schedule-config', {
    headers: {
      'Authorization': `Bearer ${getJwtToken()}`,
    },
  });
  
  if (response.status === 404) {
    return null; // Ainda não configurado
  }
  
  const data = await response.json();
  return data.data;
}
```

---

### 1.3 Criar Período Bloqueado (Feriados, Férias)

**Endpoint**: `POST /api/admin/appointments/blocked-periods`

**Headers**:
```
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Body**:
```json
{
  "startDatetime": "2026-12-24T00:00:00Z",
  "endDatetime": "2026-12-26T23:59:59Z",
  "label": "Natal"  // Opcional
}
```

**Exemplo React/Next.js**:
```typescript
// Criar período bloqueado
async function createBlockedPeriod(period: BlockedPeriod) {
  const response = await fetch('/api/admin/appointments/blocked-periods', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getJwtToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(period),
  });
  
  return response.json();
}
```

---

### 1.4 Listar Períodos Bloqueados

**Endpoint**: `GET /api/admin/appointments/blocked-periods?page=1&limit=10`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

**Exemplo de Resposta**:
```json
{
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "startDatetime": "2026-12-24T00:00:00Z",
        "endDatetime": "2026-12-26T23:59:59Z",
        "label": "Natal",
        "createdAt": "2026-04-15T10:00:00Z"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 10
  },
  "status": 200
}
```

---

### 1.5 Deletar Período Bloqueado

**Endpoint**: `DELETE /api/admin/appointments/blocked-periods/{id}`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

---

### 1.6 Listar Agendamentos

**Endpoint**: `GET /api/admin/appointments?page=1&limit=20&status=confirmed`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

**Query Params**:
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 10)
- `status` (opcional): `confirmed`, `cancelled`, ou `completed`

**Exemplo de Resposta**:
```json
{
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "leadId": "660e8400-e29b-41d4-a716-446655440001",
        "appointmentDate": "2026-06-10T00:00:00Z",
        "slotStartTime": "10:00",
        "slotEndTime": "10:30",
        "status": "confirmed",
        "selectedProduct": "5 Panel Urine (Standard)",
        "createdAt": "2026-04-15T10:00:00Z"
      }
    ],
    "count": 15,
    "page": 1,
    "limit": 20
  },
  "status": 200
}
```

**Exemplo React/Next.js**:
```typescript
// Listar agendamentos
async function listAppointments(page = 1, status?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(status && { status }),
  });
  
  const response = await fetch(`/api/admin/appointments?${params}`, {
    headers: {
      'Authorization': `Bearer ${getJwtToken()}`,
    },
  });
  
  const data = await response.json();
  return data.data;
}
```

---

### 1.7 Ver Detalhes de um Agendamento

**Endpoint**: `GET /api/admin/appointments/{id}`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

**Exemplo de Resposta**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "leadId": "660e8400-e29b-41d4-a716-446655440001",
    "appointmentDate": "2026-06-10T00:00:00Z",
    "slotStartTime": "10:00",
    "slotEndTime": "10:30",
    "status": "confirmed",
    "selectedProduct": "5 Panel Urine (Standard)",
    "notes": null,
    "createdAt": "2026-04-15T10:00:00Z",
    "Lead": {
      "name": "João Silva",
      "email": "joao@example.com",
      "phone_number": "+5511999999999"
    }
  },
  "status": 200
}
```

---

### 1.8 Cancelar Agendamento

**Endpoint**: `PATCH /api/admin/appointments/{id}/cancel`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

**Exemplo React/Next.js**:
```typescript
// Cancelar agendamento
async function cancelAppointment(appointmentId: string) {
  const response = await fetch(`/api/admin/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getJwtToken()}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

---

### 1.9 Marcar Agendamento como Completo

**Endpoint**: `PATCH /api/admin/appointments/{id}/complete`

**Headers**:
```
Authorization: Bearer {jwt-token}
```

---

## 🌐 PARTE 2: SITE PÚBLICO

### 2.1 Consultar Horários Disponíveis

**Endpoint**: `GET /api/appointments/availability?date=2026-06-10`

**Headers**:
```
X-Tenant-Key: {sua-secret-key}
```

**Query Params**:
- `date` (obrigatório): Data no formato `YYYY-MM-DD`

**Exemplo de Resposta**:
```json
{
  "data": {
    "slots": [
      {
        "startTime": "09:00",
        "endTime": "09:30",
        "date": "2026-06-10T00:00:00Z",
        "availableCapacity": 2,
        "isAvailable": true
      },
      {
        "startTime": "09:30",
        "endTime": "10:00",
        "date": "2026-06-10T00:00:00Z",
        "availableCapacity": 1,
        "isAvailable": true
      },
      {
        "startTime": "10:00",
        "endTime": "10:30",
        "date": "2026-06-10T00:00:00Z",
        "availableCapacity": 0,
        "isAvailable": false
      }
    ]
  },
  "status": 200
}
```

**Exemplo React/Next.js**:
```typescript
// Buscar horários disponíveis
async function getAvailableSlots(date: string) {
  const response = await fetch(`/api/appointments/availability?date=${date}`, {
    headers: {
      'X-Tenant-Key': process.env.NEXT_PUBLIC_TENANT_KEY!,
    },
  });
  
  const data = await response.json();
  return data.data.slots;
}

// Exemplo de uso em um componente
function AppointmentPicker() {
  const [selectedDate, setSelectedDate] = useState('2026-06-10');
  const [slots, setSlots] = useState([]);
  
  useEffect(() => {
    getAvailableSlots(selectedDate).then(setSlots);
  }, [selectedDate]);
  
  return (
    <div>
      <input 
        type="date" 
        value={selectedDate} 
        onChange={(e) => setSelectedDate(e.target.value)} 
      />
      
      <div className="slots-grid">
        {slots.map((slot) => (
          <button
            key={slot.startTime}
            disabled={!slot.isAvailable}
            className={slot.isAvailable ? 'available' : 'unavailable'}
          >
            {slot.startTime} - {slot.endTime}
            {slot.isAvailable && ` (${slot.availableCapacity} vagas)`}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### 2.2 Enviar Lead com Agendamento

**Endpoint**: `POST /api/submit`

**Headers**:
```
X-Tenant-Key: {sua-secret-key}
Content-Type: application/json
```

**Body**:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "message": "Gostaria de agendar um exame",
  "source": "website",
  "data": {
    "appointmentDate": "2026-06-10",
    "appointmentTime": "10:00",
    "selectedProduct": "5 Panel Urine (Standard)"
  }
}
```

**Exemplo de Resposta (Sucesso)**:
```json
{
  "data": {
    "leadId": "660e8400-e29b-41d4-a716-446655440001",
    "appointmentId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "status": 200
}
```

**Exemplo de Resposta (Horário Indisponível)**:
```json
{
  "statusCode": 409,
  "message": "Slot unavailable: no remaining capacity for 2026-06-10 at 10:00",
  "error": "Conflict"
}
```

**Exemplo React/Next.js**:
```typescript
// Enviar lead com agendamento
async function submitLeadWithAppointment(formData: LeadFormData) {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: {
      'X-Tenant-Key': process.env.NEXT_PUBLIC_TENANT_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      message: formData.message,
      source: 'website',
      data: {
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        selectedProduct: formData.selectedProduct,
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 409) {
      throw new Error('Este horário não está mais disponível. Por favor, escolha outro.');
    }
    
    throw new Error(error.message || 'Erro ao enviar formulário');
  }
  
  return response.json();
}
```

---

## 📱 EXEMPLO COMPLETO: Componente de Agendamento

```typescript
import { useState, useEffect } from 'react';

interface Slot {
  startTime: string;
  endTime: string;
  date: string;
  availableCapacity: number;
  isAvailable: boolean;
}

export function AppointmentBooking() {
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    selectedProduct: '5 Panel Urine (Standard)',
  });

  // Buscar slots quando a data mudar
  useEffect(() => {
    if (!selectedDate) return;
    
    setLoading(true);
    fetch(`/api/appointments/availability?date=${selectedDate}`, {
      headers: {
        'X-Tenant-Key': process.env.NEXT_PUBLIC_TENANT_KEY!,
      },
    })
      .then(res => res.json())
      .then(data => setSlots(data.data.slots))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      alert('Por favor, selecione um horário');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'X-Tenant-Key': process.env.NEXT_PUBLIC_TENANT_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source: 'website',
          data: {
            appointmentDate: selectedDate,
            appointmentTime: selectedSlot,
            selectedProduct: formData.selectedProduct,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 409) {
          alert('Este horário não está mais disponível. Por favor, escolha outro.');
          // Recarregar slots
          setSelectedSlot(null);
          return;
        }
        
        throw new Error(error.message);
      }
      
      const result = await response.json();
      alert(`Agendamento confirmado! ID: ${result.data.appointmentId}`);
      
      // Resetar formulário
      setFormData({ name: '', email: '', phone: '', message: '', selectedProduct: '' });
      setSelectedDate('');
      setSelectedSlot(null);
      
    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Agendar Horário</h2>
      
      {/* Dados pessoais */}
      <input
        type="text"
        placeholder="Nome"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      
      <input
        type="tel"
        placeholder="Telefone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
      />
      
      {/* Seleção de data */}
      <label>Escolha a data:</label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => {
          setSelectedDate(e.target.value);
          setSelectedSlot(null); // Reset slot quando mudar data
        }}
        min={new Date().toISOString().split('T')[0]} // Não permitir datas passadas
        required
      />
      
      {/* Slots disponíveis */}
      {selectedDate && (
        <div>
          <label>Escolha o horário:</label>
          {loading ? (
            <p>Carregando horários...</p>
          ) : slots.length === 0 ? (
            <p>Nenhum horário disponível para esta data.</p>
          ) : (
            <div className="slots-grid">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  disabled={!slot.isAvailable}
                  onClick={() => setSelectedSlot(slot.startTime)}
                  className={`
                    slot-button 
                    ${selectedSlot === slot.startTime ? 'selected' : ''}
                    ${!slot.isAvailable ? 'unavailable' : ''}
                  `}
                >
                  {slot.startTime} - {slot.endTime}
                  {slot.isAvailable && (
                    <span className="capacity">
                      {slot.availableCapacity} vaga{slot.availableCapacity !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      <button type="submit" disabled={loading || !selectedSlot}>
        {loading ? 'Enviando...' : 'Confirmar Agendamento'}
      </button>
    </form>
  );
}
```

---

## 🎨 CSS Exemplo

```css
.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin: 20px 0;
}

.slot-button {
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-button:hover:not(:disabled) {
  border-color: #0070f3;
  background: #f0f8ff;
}

.slot-button.selected {
  border-color: #0070f3;
  background: #0070f3;
  color: white;
}

.slot-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
}

.capacity {
  display: block;
  font-size: 0.85em;
  margin-top: 5px;
  opacity: 0.8;
}
```

---

## 🔄 Fluxo Completo

### No Painel Admin:
1. Acesse a seção de Agendamentos
2. Configure os horários de atendimento (dias da semana, horário de início/fim, intervalo, capacidade)
3. Adicione períodos bloqueados (feriados, férias)
4. Visualize e gerencie os agendamentos recebidos

### No Site Público:
1. Cliente escolhe uma data
2. Sistema busca horários disponíveis para aquela data
3. Cliente escolhe um horário disponível
4. Cliente preenche dados pessoais
5. Sistema envia lead + agendamento em uma única transação
6. Se o horário ainda estiver disponível, confirma o agendamento
7. Se o horário foi preenchido por outra pessoa, retorna erro 409

---

## ⚠️ Tratamento de Erros

### Erro 409 - Horário Indisponível
```typescript
if (response.status === 409) {
  // Horário foi preenchido por outra pessoa
  alert('Este horário não está mais disponível. Por favor, escolha outro.');
  // Recarregar slots disponíveis
  refreshSlots();
}
```

### Erro 422 - Validação
```typescript
if (response.status === 422) {
  // Erro de validação (horário inválido, fora do expediente, etc)
  const error = await response.json();
  alert(error.message);
}
```

### Erro 404 - Configuração Não Encontrada
```typescript
if (response.status === 404) {
  // Admin ainda não configurou os horários
  alert('Sistema de agendamentos ainda não está configurado.');
}
```

---

## 📊 TypeScript Types

```typescript
// Types para usar no frontend
export interface ScheduleConfig {
  workingDays: number[];  // 0-6 (Domingo a Sábado)
  workStartTime: string;  // "HH:MM"
  workEndTime: string;    // "HH:MM"
  slotIntervalMinutes: number;  // 5-480
  capacityPerSlot: number;      // >= 1
  lunchStartTime?: string;      // "HH:MM"
  lunchEndTime?: string;        // "HH:MM"
}

export interface TimeSlot {
  startTime: string;      // "HH:MM"
  endTime: string;        // "HH:MM"
  date: string;           // ISO date
  availableCapacity: number;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  leadId: string;
  appointmentDate: string;  // ISO date
  slotStartTime: string;    // "HH:MM"
  slotEndTime: string;      // "HH:MM"
  status: 'confirmed' | 'cancelled' | 'completed';
  selectedProduct?: string;
  notes?: string;
  createdAt: string;
  Lead?: {
    name: string;
    email: string;
    phone_number: string;
  };
}

export interface BlockedPeriod {
  id?: string;
  startDatetime: string;  // ISO datetime
  endDatetime: string;    // ISO datetime
  label?: string;
}
```

---

## 🚀 Pronto para Usar!

Agora você tem tudo que precisa para integrar o sistema de agendamentos:

1. **No Painel**: Configure horários e gerencie agendamentos
2. **No Site**: Mostre horários disponíveis e permita agendamentos

O sistema previne overbooking automaticamente usando transações e locks no banco de dados! 🎉
