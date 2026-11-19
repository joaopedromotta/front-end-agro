const API_BASE_URL = "https://agro-guard-kxd6.onrender.com/v1";

const equipmentTypeLabels = {
    CAMERA: "Câmera",
    SENSOR_MOVIMENTO: "Sensor de movimento",
    ALARME: "Alarme",
    CERCA_ELETRICA: "Cerca elétrica",
    DRONE: "Drone",
    RADIO_COMUNICADOR: "Rádio comunicador",
    MAQUINARIO_GERAL: "Maquinário geral",
    OUTRO: "Outro"
};

const equipmentStatusLabels = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    EM_MANUTENCAO: "Em manutenção",
    DANIFICADO: "Danificado",
    DESCARTADO: "Descartado"
};

const occurrenceTypeLabels = {
    ROUBO: "Roubo",
    INVASAO: "Invasão",
    VANDALISMO: "Vandalismo",
    INCENDIO: "Incêndio",
    FALHA_DE_EQUIPAMENTO: "Falha de equipamento",
    ATIVIDADE_SUSPEITA: "Atividade suspeita",
    DANOS_A_PROPRIEDADE: "Danos à propriedade",
    ANIMAL: "Animal",
    OUTRO: "Outro"
};

const occurrenceGravityLabels = {
    BAIXA: "Baixa",
    MEDIA: "Média",
    ALTA: "Alta",
    CRITICA: "Crítica"
};

const occurrenceStatusLabels = {
    ABERTA: "Aberta",
    EM_ANALISE: "Em análise",
    EM_ANDAMENTO: "Em andamento",
    RESOLVIDA: "Resolvida",
    CANCELADA: "Cancelada"
};

const resourceConfigs = {
    users: {
        endpoint: "/users",
        emptyMessage: "Nenhum usuário cadastrado.",
        errorMessage: "Não foi possível carregar os usuários.",
        columns: user => [user.id, user.name, user.email, user.cpf, user.role],
        canDelete: user => user.role !== "ADMIN",
        buildPayload: data => ({
            name: data.get("name"),
            email: data.get("email"),
            cpf: data.get("cpf")
        }),
        formTitle: "usuário"
    },
    employees: {
        endpoint: "/users",
        emptyMessage: "Nenhum funcionário cadastrado.",
        errorMessage: "Não foi possível carregar os funcionários.",
        filter: user => user.role === "EMPLOYEE",
        columns: user => [user.id, user.name, user.email, user.cpf],
        canEdit: false
    },
    properties: {
        endpoint: "/properties",
        emptyMessage: "Nenhuma propriedade cadastrada.",
        errorMessage: "Não foi possível carregar as propriedades.",
        columns: (property, employeeNames) => [
            property.id,
            property.name,
            property.address,
            property.hectares == null ? "" : Number(property.hectares).toLocaleString("pt-BR"),
            property.ownerId,
            Array.isArray(property.employeeIds) ? property.employeeIds.map(id =>
                employeeNames.get(String(id)) || `ID ${id}`
            ).join(", ") : ""
        ],
        buildPayload: data => ({
            name: data.get("name"),
            address: data.get("address"),
            hectares: Number(data.get("hectares")),
            ownerId: Number(data.get("ownerId"))
        }),
        formTitle: "propriedade",
        hasTeamActions: true
    },
    equipments: {
        endpoint: "/equipments",
        propertyEndpoint: "/property",
        emptyMessage: "Nenhum equipamento cadastrado.",
        errorMessage: "Não foi possível carregar os equipamentos.",
        columns: equipment => [
            equipment.id,
            equipment.name,
            equipmentTypeLabels[equipment.type] || equipment.type,
            equipmentStatusLabels[equipment.status] || equipment.status,
            equipment.propertyId
        ],
        buildPayload: data => ({
            name: data.get("name"),
            type: data.get("type"),
            status: data.get("status"),
            propertyId: Number(data.get("propertyId"))
        }),
        formTitle: "equipamento"
    },
    occurrences: {
        endpoint: "/occurrences",
        propertyEndpoint: "/property",
        emptyMessage: "Nenhuma ocorrência cadastrada.",
        errorMessage: "Não foi possível carregar as ocorrências.",
        columns: occurrence => [
            occurrence.title,
            occurrenceTypeLabels[occurrence.type] || occurrence.type,
            occurrenceGravityLabels[occurrence.gravity] || occurrence.gravity,
            occurrenceStatusLabels[occurrence.status] || occurrence.status,
            formatDate(occurrence.dateTime),
            occurrence.propertyId
        ],
        buildPayload: data => ({
            title: data.get("title"),
            description: data.get("description"),
            type: data.get("type"),
            gravity: data.get("gravity"),
            status: data.get("status"),
            propertyId: Number(data.get("propertyId"))
        }),
        formTitle: "ocorrência"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const resource = document.body.dataset.resource;
    const config = resourceConfigs[resource];
    if (!config) {
        console.error(`Recurso de tela desconhecido: ${resource || "(vazio)"}.`);
        return;
    }

    const tableBody = document.getElementById("record-table-body");
    const form = document.getElementById("record-form");
    const formDialog = document.getElementById("form-dialog");
    const formMessage = document.getElementById("form-message");
    const searchInput = document.querySelector(".search-input[type='search'], .search-input[type='text']");
    const propertyFilter = document.getElementById("property-filter");
    const openFormButton = document.getElementById("open-form");
    const closeFormButton = document.getElementById("close-form");
    const teamForm = document.getElementById("team-form");
    const teamDialog = document.getElementById("team-dialog");
    const teamMessage = document.getElementById("team-message");
    let records = [];
    let employeeNames = new Map();

    if (form && formDialog && formMessage && openFormButton && closeFormButton) {
        openFormButton.addEventListener("click", () => {
            form.reset();
            form.elements.namedItem("id").value = "";
            formMessage.textContent = "";
            setFormMode(config, false);
            formDialog.hidden = false;
            focusFirstFormField(form);
        });

        closeFormButton.addEventListener("click", () => {
            formDialog.hidden = true;
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            saveRecord(config, form, formDialog, formMessage, loadRecords);
        });
    }

    if (tableBody) {
        tableBody.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");
            if (!button) return;

            const record = records.find(item => String(item.id) === button.dataset.id);
            if (!record) return;

            if (button.dataset.action === "edit") {
                openEditForm(config, form, formDialog, formMessage, record);
            } else if (button.dataset.action === "delete") {
                deleteRecord(config, record, loadRecords);
            } else if (button.dataset.action === "team") {
                openTeamForm(teamForm, teamDialog, teamMessage, record);
            }
        });
    }

    if (teamForm && teamDialog) {
        document.getElementById("close-team-form").addEventListener("click", () => {
            teamDialog.hidden = true;
        });
        teamForm.addEventListener("submit", event => {
            event.preventDefault();
            updatePropertyTeam(config, teamForm, teamDialog, teamMessage, loadRecords);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => filterVisibleRows(tableBody, searchInput.value));
    }
    if (propertyFilter) {
        propertyFilter.addEventListener("change", loadRecords);
    }

    async function loadRecords() {
        try {
            const propertyId = propertyFilter ? propertyFilter.value : "";
            const path = propertyId && config.propertyEndpoint
                ? `${config.endpoint}${config.propertyEndpoint}/${encodeURIComponent(propertyId)}`
                : config.endpoint;
            const response = await apiRequest(path);
            if (!Array.isArray(response)) {
                throw new Error("A API retornou uma lista em formato inesperado.");
            }

            records = config.filter ? response.filter(config.filter) : response;
            renderRecords(config, tableBody, records, employeeNames);
            if (searchInput) filterVisibleRows(tableBody, searchInput.value);
        } catch (error) {
            console.error(config.errorMessage, error);
            records = [];
            showTableMessage(tableBody, config.errorMessage);
        }
    }

    async function initializeOptions() {
        if (resource === "properties") {
            const ownerSelect = document.getElementById("ownerId");
            const teamUserSelect = document.getElementById("team-user-id");
            if (!ownerSelect && !teamUserSelect) return;

            try {
                const users = await apiRequest("/users");
                if (!Array.isArray(users)) throw new Error("A API retornou uma lista de usuários inválida.");
                fillSelect(ownerSelect, users, user => `${user.name} (ID ${user.id})`);
                const teamMembers = users.filter(user => user.role === "EMPLOYEE" || user.role === "USER");
                employeeNames = new Map(teamMembers.map(user => [String(user.id), user.name]));
                fillSelect(teamUserSelect, teamMembers, user => `${user.name} (ID ${user.id})`);
            } catch (error) {
                console.error("Não foi possível carregar usuários para a propriedade.", error);
                if (formMessage) formMessage.textContent = "Não foi possível carregar usuários para seleção.";
                if (teamMessage) teamMessage.textContent = "Não foi possível carregar funcionários para seleção.";
            }
            return;
        }

        if (config.propertyEndpoint) {
            try {
                const properties = await apiRequest("/properties");
                if (!Array.isArray(properties)) throw new Error("A API retornou uma lista de propriedades inválida.");
                fillSelect(document.getElementById("propertyId"), properties, property => `${property.name} (ID ${property.id})`);
                fillSelect(document.getElementById("property-filter"), properties, property => `${property.name} (ID ${property.id})`);
            } catch (error) {
                console.error("Não foi possível carregar propriedades para seleção.", error);
                if (formMessage) formMessage.textContent = "Não foi possível carregar propriedades para seleção.";
            }
        }
    }

    initializeOptions().then(loadRecords);
});

async function apiRequest(path, options) {
    const requestHeaders = new Headers(options && options.headers ? options.headers : {});
    const token = sessionStorage.getItem("agroGuardToken");
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...(options || {}),
        headers: requestHeaders
    });
    if (!response.ok) {
        const details = await response.text();
        if (response.status === 401) {
            sessionStorage.removeItem("agroGuardToken");
            sessionStorage.removeItem("agroGuardUserId");
            sessionStorage.removeItem("agroGuardName");
            window.location.replace("./login.html");
        }

        let message = details;
        if (details) {
            try {
                message = JSON.parse(details).message || details;
            } catch {
                message = details;
            }
        }
        throw new Error(message || `Falha na solicitação (HTTP ${response.status}).`);
    }

    if (response.status === 204) return null;
    const body = await response.text();
    return body ? JSON.parse(body) : null;
}

function renderRecords(config, tableBody, records, employeeNames) {
    if (!tableBody) return;
    tableBody.replaceChildren();

    if (records.length === 0) {
        showTableMessage(tableBody, config.emptyMessage);
        return;
    }

    records.forEach(record => {
        const row = document.createElement("tr");
        config.columns(record, employeeNames).forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value == null ? "" : String(value);
            row.appendChild(cell);
        });

        if (config.canEdit !== false) {
            const actions = document.createElement("td");
            actions.className = "actions";
            if (record.id == null) {
                actions.textContent = "ID indisponível";
            } else {
                if (config.hasTeamActions) {
                    actions.appendChild(createActionButton("team", record.id, "Equipe", "btn-action"));
                }
                actions.appendChild(createActionButton("edit", record.id, "Editar", "btn-action btn-edit"));
                if (!config.canDelete || config.canDelete(record)) {
                    actions.appendChild(createActionButton("delete", record.id, "Excluir", "btn-action btn-delete"));
                }
            }
            row.appendChild(actions);
        }

        tableBody.appendChild(row);
    });
}

function createActionButton(action, id, label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.dataset.id = id;
    button.textContent = label;
    return button;
}

function showTableMessage(tableBody, message) {
    if (!tableBody) return;
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = tableBody.closest("table").tHead.rows[0].cells.length;
    cell.textContent = message;
    row.appendChild(cell);
    tableBody.replaceChildren(row);
}

function fillSelect(select, options, label) {
    if (!select) return;
    const firstOption = select.options[0].cloneNode(true);
    select.replaceChildren(firstOption);
    options.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = label(item);
        select.appendChild(option);
    });
}

function setFormMode(config, editing) {
    const title = document.getElementById("form-title");
    const saveButton = document.getElementById("save-button");
    const label = config.formTitle || "registro";
    if (title) title.textContent = `${editing ? "Editar" : "Cadastrar"} ${label}`;
    if (saveButton) saveButton.textContent = `${editing ? "Salvar alterações" : "Cadastrar"} ${editing ? "" : label}`.trim();
}

function focusFirstFormField(form) {
    const field = Array.from(form.elements).find(element =>
        element instanceof HTMLElement && element.type !== "hidden" && !element.disabled
    );
    if (field) field.focus();
}

function openEditForm(config, form, dialog, message, record) {
    if (!form || !dialog) return;
    form.reset();
    message.textContent = "";
    form.elements.namedItem("id").value = record.id;
    Object.keys(record).forEach(name => {
        const field = form.elements.namedItem(name);
        if (field && record[name] != null) field.value = record[name];
    });
    setFormMode(config, true);
    dialog.hidden = false;
    focusFirstFormField(form);
}

async function saveRecord(config, form, dialog, message, reloadRecords) {
    const formData = new FormData(form);
    const id = formData.get("id");
    const path = id ? `${config.endpoint}/${encodeURIComponent(id)}` : config.endpoint;
    const method = id ? "PUT" : "POST";
    const saveButton = document.getElementById("save-button");
    message.textContent = "";
    if (saveButton) saveButton.disabled = true;

    try {
        await apiRequest(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config.buildPayload(formData))
        });
        form.reset();
        dialog.hidden = true;
        await reloadRecords();
    } catch (error) {
        console.error("Erro ao salvar registro.", error);
        message.textContent = `Não foi possível salvar. ${error.message}`;
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

async function deleteRecord(config, record, reloadRecords) {
    if (config.canDelete && !config.canDelete(record)) {
        window.alert("Contas com perfil ADMIN não podem ser excluídas por esta tela.");
        return;
    }

    if (!window.confirm(`Deseja excluir "${record.name || record.title || `ID ${record.id}`}"?`)) return;
    try {
        if (config.endpoint === "/users") {
            const properties = await apiRequest("/properties");
            if (!Array.isArray(properties)) {
                throw new Error("A API retornou uma lista de propriedades inválida.");
            }

            const linkedProperties = properties.flatMap(property => {
                const links = [];
                if (String(property.ownerId) === String(record.id)) {
                    links.push(`${property.name} (proprietário)`);
                }
                if (Array.isArray(property.employeeIds) &&
                    property.employeeIds.some(id => String(id) === String(record.id))) {
                    links.push(`${property.name} (equipe)`);
                }
                return links;
            });

            if (linkedProperties.length > 0) {
                window.alert(
                    `Não é possível excluir "${record.name}" porque está vinculado a: ${linkedProperties.join(", ")}. ` +
                    "Troque o proprietário ou remova o usuário da equipe na tela Propriedades e tente novamente."
                );
                return;
            }
        }

        await apiRequest(`${config.endpoint}/${encodeURIComponent(record.id)}`, { method: "DELETE" });
        await reloadRecords();
    } catch (error) {
        console.error("Erro ao excluir registro.", error);
        window.alert(`Não foi possível excluir. ${error.message}`);
    }
}

function openTeamForm(form, dialog, message, property) {
    if (!form || !dialog) return;
    form.reset();
    message.textContent = "";
    form.elements.namedItem("propertyId").value = property.id;
    dialog.hidden = false;
}

async function updatePropertyTeam(config, form, dialog, message, reloadRecords) {
    const data = new FormData(form);
    const propertyId = data.get("propertyId");
    const userId = data.get("userId");
    const method = data.get("operation") === "remove" ? "DELETE" : "POST";
    message.textContent = "";

    try {
        await apiRequest(`${config.endpoint}/${encodeURIComponent(propertyId)}/employees/${encodeURIComponent(userId)}`, {
            method
        });
        dialog.hidden = true;
        await reloadRecords();
    } catch (error) {
        console.error("Erro ao atualizar equipe da propriedade.", error);
        message.textContent = `Não foi possível atualizar a equipe. ${error.message}`;
    }
}

function filterVisibleRows(tableBody, query) {
    if (!tableBody) return;
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    Array.from(tableBody.rows).forEach(row => {
        if (row.cells.length === 1 && row.cells[0].colSpan > 1) return;
        row.hidden = !row.textContent.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    });
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
}
