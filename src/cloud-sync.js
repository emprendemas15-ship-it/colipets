(() => {
    'use strict';

    const config = window.COLIPETS_SUPABASE_CONFIG || {};
    const appShell = document.getElementById('appShell');
    const authPanel = document.getElementById('colipetsAuthPanel');
    const authForm = document.getElementById('colipetsAuthForm');
    const authMessage = document.getElementById('colipetsAuthMessage');
    const syncStatus = document.getElementById('colipetsSyncStatus');
    const openAuthButton = document.getElementById('colipetsOpenAuth');
    const signOutButton = document.getElementById('colipetsSignOut');
    const ownerKey = '__colipets_cloud_owner';
    const backupPrefix = '__colipets_local_backup:';
    // This idempotency marker is intentionally stored as a raw string by the
    // Excel importer, so it must never be parsed or uploaded as app JSON.
    const reservedStateKeys = new Set([ownerKey, 'colipets_xlsm_migrated_sha256_v1', 'colipets_migration_issues_v1']);
    const appStateKey = key => !reservedStateKeys.has(key) && (key.startsWith('taller_') || key.startsWith('colipets_'));
    let client;
    let currentUserId;
    let syncTimer;
    let syncQueue = Promise.resolve();
    let appLoaded = false;
    let hooksInstalled = false;
    let activatingUserId;
    let activatingSession;

    function setAuthMessage(message, isError = false) {
        authMessage.textContent = message;
        authMessage.classList.toggle('text-rose-700', isError);
        authMessage.classList.toggle('text-slate-600', !isError);
    }

    function setSyncStatus(message, isError = false) {
        syncStatus.textContent = message;
        syncStatus.classList.toggle('text-rose-700', isError);
        syncStatus.classList.toggle('text-emerald-800', !isError);
    }

    function showLocalMode(message = 'Solo en este dispositivo') {
        currentUserId = undefined;
        authPanel.hidden = true;
        document.getElementById('colipetsCloudControls').hidden = false;
        openAuthButton.hidden = !client;
        signOutButton.hidden = true;
        document.body.classList.remove('cloud-locked');
        setSyncStatus(message);
    }

    function collectLocalState() {
        const state = {};
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key && appStateKey(key)) {
                try {
                    state[key] = JSON.parse(localStorage.getItem(key));
                } catch (error) {
                    console.warn('Se omitió un dato local que no está guardado como JSON:', key);
                }
            }
        }
        return state;
    }

    function stableValue(value) {
        if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    function itemIdentity(value, key) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const catalogKeys = ['taller_pt_vla', 'taller_mp_vla', 'taller_nofab_v1', 'taller_clientes_v1'];
            const identity = value.id || value.operationId || value.numero ||
                (catalogKeys.includes(key) ? value.codigo || value.nombre : '');
            if (identity) return String(identity);
        }
        return stableValue(value);
    }

    function mergeValue(localValue, cloudValue, key) {
        if (Array.isArray(localValue) && Array.isArray(cloudValue)) {
            const merged = localValue.map(value => value);
            const indexByIdentity = new Map(merged.map((value, index) => [itemIdentity(value, key), index]));
            for (const cloudValueItem of cloudValue) {
                const identity = itemIdentity(cloudValueItem, key);
                const existingIndex = indexByIdentity.get(identity);
                if (existingIndex === undefined) {
                    indexByIdentity.set(identity, merged.length);
                    merged.push(cloudValueItem);
                } else {
                    merged[existingIndex] = mergeValue(merged[existingIndex], cloudValueItem, key);
                }
            }
            return merged;
        }

        if (localValue && cloudValue &&
            typeof localValue === 'object' && typeof cloudValue === 'object' &&
            !Array.isArray(localValue) && !Array.isArray(cloudValue)) {
            const merged = { ...localValue };
            for (const [property, value] of Object.entries(cloudValue)) {
                merged[property] = Object.hasOwn(merged, property)
                    ? mergeValue(merged[property], value, property)
                    : value;
            }
            return merged;
        }

        return cloudValue === undefined ? localValue : cloudValue;
    }

    function mergeState(localState, cloudState, cloudIsAuthoritative = false) {
        const merged = { ...localState };
        for (const [key, cloudValue] of Object.entries(cloudState || {})) {
            if (!appStateKey(key)) continue;
            const catalogKeys = ['taller_pt_vla', 'taller_mp_vla', 'taller_nofab_v1', 'taller_clientes_v1'];
            merged[key] = cloudIsAuthoritative && catalogKeys.includes(key)
                ? cloudValue
                : Object.hasOwn(merged, key)
                ? mergeValue(merged[key], cloudValue, key)
                : cloudValue;
        }
        return merged;
    }

    function storeLocalState(state, replace = false) {
        if (replace) {
            for (let index = localStorage.length - 1; index >= 0; index -= 1) {
                const key = localStorage.key(index);
                if (key && appStateKey(key)) localStorage.removeItem(key);
            }
        }
        for (const [key, value] of Object.entries(state)) {
            if (!appStateKey(key)) continue;
            const serialized = JSON.stringify(value);
            if (localStorage.getItem(key) !== serialized) localStorage.setItem(key, serialized);
        }
    }

    function showAuthPanel(message = '') {
        document.body.classList.add('cloud-locked');
        authPanel.hidden = false;
        document.getElementById('colipetsCloudControls').hidden = true;
        setAuthMessage(message);
        authForm.elements.email.focus();
    }

    function loadScript(source) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = source;
            script.async = false;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`No se pudo cargar ${source}.`));
            document.body.appendChild(script);
        });
    }

    async function loadApplication() {
        if (appLoaded) return;
        await loadScript('./src/legacy/clean-baseline.js');
        await loadScript('./src/legacy/original-calculator.js');
        if (document.readyState === 'complete' && typeof window.onload === 'function') window.onload();
        await loadScript('./src/app.js?v=17');
        if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
        appLoaded = true;
        authPanel.hidden = true;
        document.getElementById('colipetsCloudControls').hidden = false;
        document.body.classList.remove('cloud-locked');
    }

    function scheduleSync() {
        if (!currentUserId) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncQueue = syncQueue
                .then(syncNow)
                .catch(error => {
                    console.error('Error al sincronizar los datos de COLIPETS:', error);
                    setSyncStatus(`Error al sincronizar: ${error.message}`, true);
                });
        }, 700);
    }

    setInterval(scheduleSync, 60_000);

    async function syncNow() {
        if (!currentUserId) return;
        setSyncStatus('Sincronizando…');
        const { data, error } = await client.rpc('sync_colipets_app_state', {
            p_data: collectLocalState()
        });
        if (error) throw new Error(error.message);
        const savedState = Array.isArray(data) ? data[0] : data;
        if (!savedState || !savedState.data) {
            throw new Error('Supabase no devolvió el estado guardado de COLIPETS.');
        }

        const merged = mergeState(collectLocalState(), savedState.data, true);
        storeLocalState(merged);
        setSyncStatus(`Sincronizado · ${new Date(savedState.updated_at).toLocaleTimeString()}`);
    }

    function watchForLocalChanges() {
        if (hooksInstalled) return;
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            const result = originalSetItem.call(this, key, value);
            if (this === localStorage && appStateKey(String(key))) scheduleSync();
            return result;
        };

        const originalRemoveItem = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function (key) {
            const result = originalRemoveItem.call(this, key);
            if (this === localStorage && appStateKey(String(key))) scheduleSync();
            return result;
        };

        window.addEventListener('storage', event => {
            if (appStateKey(event.key || '') && currentUserId) scheduleSync();
        });
        hooksInstalled = true;
    }

    async function prepareUserState(user) {
        const previousOwner = localStorage.getItem(ownerKey);
        if (previousOwner && previousOwner !== user.id) {
            const previousBackup = backupPrefix + previousOwner;
            localStorage.setItem(previousBackup, JSON.stringify(collectLocalState()));
            for (let index = localStorage.length - 1; index >= 0; index -= 1) {
                const key = localStorage.key(index);
                if (key && appStateKey(key)) localStorage.removeItem(key);
            }
            const userBackup = localStorage.getItem(backupPrefix + user.id);
            if (userBackup) storeLocalState(JSON.parse(userBackup));
        }

        const { data: savedState, error } = await client
            .from('colipets_app_state')
            .select('data')
            .maybeSingle();
        if (error) throw new Error(error.message);

        const merged = mergeState(collectLocalState(), savedState?.data || {});
        storeLocalState(merged);
        currentUserId = user.id;
        const { error: syncError } = await client.rpc('sync_colipets_app_state', {
            p_data: merged
        });
        if (syncError) {
            currentUserId = undefined;
            throw new Error(syncError.message);
        }

        localStorage.setItem(ownerKey, user.id);
        watchForLocalChanges();
        setSyncStatus(`Sincronizado · ${user.email || 'cuenta compartida'}`);
        document.getElementById('colipetsCloudControls').hidden = false;
        openAuthButton.hidden = true;
        signOutButton.hidden = false;
        authPanel.hidden = true;
        document.body.classList.remove('cloud-locked');
        await loadApplication();
        subscribeToRemoteChanges(user.id);
    }

    function subscribeToRemoteChanges(userId) {
        client.channel(`colipets-state-${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'colipets_app_state',
                filter: `user_id=eq.${userId}`
            }, payload => {
                const incoming = payload.new?.data;
                if (!incoming || !currentUserId) return;
                const localState = collectLocalState();
                const mergedState = mergeState(localState, incoming, true);
                if (stableValue(mergedState) === stableValue(localState)) return;
                storeLocalState(mergedState);
                setSyncStatus('Actualizado desde otro dispositivo · guardando cambios…');
                scheduleSync();
            })
            .subscribe((status, error) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('No se pudo activar la sincronización en tiempo real de COLIPETS:', error);
                    setSyncStatus('Actualización en tiempo real no disponible; se reintentará automáticamente.', true);
                }
            });
    }

    async function activateSession(session) {
        if (!session?.user || currentUserId === session.user.id) return activatingSession;
        if (activatingUserId === session.user.id) return activatingSession;
        activatingUserId = session.user.id;
        activatingSession = (async () => {
            const authPanelWasOpen = !authPanel.hidden;
            setSyncStatus('Conectando y sincronizando…');
            try {
                await prepareUserState(session.user);
            } catch (error) {
                console.error('No se pudo preparar la cuenta de COLIPETS en Supabase:', error);
                if (authPanelWasOpen) {
                    showAuthPanel(`No se pudo conectar: ${error.message}. Comprueba la configuración de Supabase.`);
                } else {
                    showLocalMode(`No se pudo sincronizar: ${error.message}. Tus datos siguen en este dispositivo.`);
                }
            } finally {
                activatingUserId = undefined;
                activatingSession = undefined;
            }
        })();
        return activatingSession;
    }

    function setupAuthentication() {
        const url = String(config.url || '').trim();
        const anonKey = String(config.anonKey || '').trim();
        if (!url || !anonKey || !window.supabase) {
            showLocalMode();
            return;
        }

        client = window.supabase.createClient(url, anonKey);
        showLocalMode('Solo en este dispositivo · inicia sesión para sincronizar');
        openAuthButton.addEventListener('click', () => {
            showAuthPanel('Inicia sesión o crea una cuenta para sincronizar tus datos entre dispositivos.');
        });
        authForm.addEventListener('submit', async event => {
            event.preventDefault();
            const email = authForm.elements.email.value.trim();
            const password = authForm.elements.password.value;
            setAuthMessage('Iniciando sesión…');
            try {
                const { data, error } = await client.auth.signInWithPassword({ email, password });
                if (error) {
                    setAuthMessage(error.message, true);
                    return;
                }
                await activateSession(data.session);
            } catch (error) {
                console.error('Error al iniciar sesión en COLIPETS:', error);
                setAuthMessage(`No se pudo iniciar sesión: ${error.message}`, true);
            }
        });

        document.getElementById('colipetsSignUp').addEventListener('click', async () => {
            const email = authForm.elements.email.value.trim();
            const password = authForm.elements.password.value;
            if (!email || password.length < 8) {
                setAuthMessage('Escribe tu correo y una contraseña de al menos 8 caracteres.', true);
                return;
            }
            setAuthMessage('Creando la cuenta compartida…');
            try {
                const { data, error } = await client.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: window.location.href }
                });
                if (error) {
                    setAuthMessage(error.message, true);
                    return;
                }
                if (data.session) {
                    await activateSession(data.session);
                } else {
                    setAuthMessage('Cuenta creada. Confirma el correo y después inicia sesión en este equipo y en los demás.');
                }
            } catch (error) {
                console.error('Error al crear la cuenta compartida de COLIPETS:', error);
                setAuthMessage(`No se pudo crear la cuenta: ${error.message}`, true);
            }
        });

        document.getElementById('colipetsUseOffline').addEventListener('click', async () => {
            showLocalMode();
        });

        signOutButton.addEventListener('click', async () => {
            clearTimeout(syncTimer);
            try {
                await syncNow();
                const { error } = await client.auth.signOut();
                if (error) throw new Error(error.message);
            } catch (error) {
                console.error('No se pudo guardar o cerrar la sesión de COLIPETS:', error);
                setSyncStatus(`No se pudo cerrar sesión: ${error.message}`, true);
                return;
            }
            showLocalMode('Sesión cerrada · los datos siguen en este dispositivo');
        });

        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                queueMicrotask(() => activateSession(session));
            }
            if (event === 'SIGNED_OUT') {
                showLocalMode('Sesión cerrada · los datos siguen en este dispositivo');
            }
        });

        client.auth.getSession()
            .then(({ data, error }) => {
                if (error) {
                    console.error('No se pudo comprobar la sesión de COLIPETS:', error);
                    showLocalMode('Modo local · no se pudo comprobar la sesión');
                    return;
                }
                if (data.session) {
                    return activateSession(data.session);
                }
            })
            .catch(error => {
                console.error('No se pudo comprobar la sesión de COLIPETS:', error);
                showLocalMode('Modo local · no se pudo comprobar la sesión');
            });
    }

    loadApplication()
        .then(() => {
            if (!config.url || !config.anonKey) {
                setupAuthentication();
                return;
            }
            return loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')
                .then(setupAuthentication)
                .catch(error => {
                    console.error('No se pudo cargar el cliente de Supabase:', error);
                    showLocalMode('Modo local · conexión de sincronización no disponible');
                });
        })
        .catch(error => {
            console.error('No se pudo iniciar COLIPETS:', error);
            showAuthPanel(`No se pudo iniciar COLIPETS: ${error.message}`);
        });
})();
