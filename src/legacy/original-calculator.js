let inventarioMP = JSON.parse(localStorage.getItem("taller_mp_vla")) || [];

        let inventarioPT = JSON.parse(localStorage.getItem("taller_pt_vla")) || [];

        function cambiarVista(vista) {
            const vistas = {
                calculadora: 'vistaCalculadora',
                inventario: 'vistaInventario',
                productos: 'vistaProductos'
            };
            Object.entries(vistas).forEach(([key, id]) => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden', key !== vista);
            });

            const botones = {
                calculadora: document.getElementById('btnVistaCalc'),
                inventario: document.getElementById('btnVistaInv'),
                productos: document.getElementById('btnVistaPT')
            };
            Object.entries(botones).forEach(([key, btn]) => {
                if (!btn) return;
                const activo = key === vista;
                btn.className = activo
                    ? 'px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm'
                    : 'px-4 py-2 bg-white border text-slate-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-50';
            });

            if (vista === 'inventario') renderizarTablaMP();
            if (vista === 'productos') renderizarTablaPT();
        }

        function obtenerResumenCostos() {
            return {
                codigo: document.getElementById('codigoPT').value.trim().toUpperCase(),
                detalle: document.getElementById('detallePT').value.trim(),
                costo: document.getElementById('resTotalFinal').innerText,
                mayorista: document.getElementById('resMayorista').innerText,
                publico: document.getElementById('resPublico').innerText
            };
        }

        function generarCotizacion(e) {
            const container = document.getElementById('resultadoCotizacion');
            if (!container) return;

            if (e && e.type === 'submit') {
                e.preventDefault();
                const formulario = e.currentTarget;
                if (!formulario.reportValidity()) return;
                const producto = obtenerResumenCostos();
                if (!producto.codigo || !producto.detalle) {
                    showMessage('Ingresa el código y la descripción del producto.');
                    return;
                }
                const datos = new FormData(formulario);
                const fecha = new Date();
                const vigencia = Number(datos.get('vigencia'));
                const vencimiento = new Date(fecha);
                vencimiento.setDate(vencimiento.getDate() + vigencia);
                const fechaFormato = fecha.toLocaleDateString('es-CO');
                const vencimientoFormato = vencimiento.toLocaleDateString('es-CO');
                                const materiales = [];
                                for (let i = 1; i <= 8; i++) {
                                        const codigo = document.getElementById(`mpCodigo${i}`).value;
                                        if (!codigo) continue;
                                        const material = inventarioMP.find(item => item.codigo === codigo);
                                        materiales.push({
                                                codigo,
                                                detalle: material ? material.detalle : codigo,
                                                cantidad: document.getElementById(`mpCant${i}`).value || '0',
                                                medidas: `${document.getElementById(`mpAncho${i}`).value || 0} × ${document.getElementById(`mpLargo${i}`).value || 0} cm`,
                                                valor: document.getElementById(`mpPrecio${i}`).innerText
                                        });
                                }

                container.innerHTML = `
                                        <div class="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-lg">
                                            <div class="bg-gradient-to-r from-indigo-700 to-indigo-500 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
                                                <div class="flex items-center gap-3"><img src="${document.getElementById('colipetsFavicon')?.href||''}" alt="Logo COLIPETS" class="h-14 w-14 rounded-lg object-contain bg-white p-1"><div><p class="text-[10px] uppercase tracking-[0.2em] text-indigo-200 font-bold">COLIPETS</p><h3 class="text-xl font-black">Cotización</h3></div></div>
                                                <div class="text-right text-xs"><p>Fecha: <strong data-campo="fecha"></strong></p><p>Válida hasta: <strong data-campo="vencimiento"></strong> (<span data-campo="vigencia"></span> días)</p></div>
                                            </div>
                                            <div class="p-5 space-y-4 text-slate-700">
                                                <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <h4 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Datos del cliente</h4>
                                                    <p class="font-semibold text-slate-900" data-campo="nombre"></p>
                                                    <p class="text-sm"><strong>Teléfono:</strong> <span data-campo="telefono"></span></p>
                                                </div>
                                                <div class="rounded-xl border border-indigo-100 p-4">
                                                    <h4 class="text-xs font-bold uppercase tracking-wide text-indigo-600">Producto cotizado</h4>
                                                    <p class="mt-1 text-lg font-bold text-slate-900"><span data-campo="codigo"></span> — <span data-campo="detalle"></span></p>
                                                    <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                                                        <table class="w-full text-left text-xs">
                                                            <thead class="bg-slate-100 uppercase text-slate-600"><tr><th class="p-2">Material</th><th class="p-2">Medidas</th><th class="p-2 text-right">Cantidad</th><th class="p-2 text-right">Valor</th></tr></thead>
                                                            <tbody id="cotizacionMateriales" class="divide-y divide-slate-100"></tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-bold uppercase text-slate-500">Valor total</p><p class="mt-1 text-xl font-black text-slate-800" data-campo="costo"></p></div>
                                                    <div class="rounded-xl border border-emerald-300 bg-emerald-50 p-4"><p class="text-xs font-bold uppercase text-emerald-700">Precio al público</p><p class="mt-1 text-2xl font-black text-emerald-800" data-campo="publico"></p></div>
                                                </div>
                                                <p class="text-xs text-slate-500">Precio mayorista: <strong data-campo="mayorista"></strong></p>
                                            </div>
                                        </div>
                                        <div class="mt-4 flex gap-2 flex-wrap print:hidden">
                                                <button type="button" onclick="window.print()" class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer">ðŸ–¨ï¸ Imprimir / Guardar PDF</button>
                                                <button type="button" onclick="generarCotizacion()" class="px-4 py-2 bg-white border text-slate-700 text-xs font-bold rounded-lg cursor-pointer">➕ Nueva cotización</button>
                    </div>
                `;
                const campos = {
                    fecha: fechaFormato,
                    vigencia: String(vigencia),
                    vencimiento: vencimientoFormato,
                    nombre: String(datos.get('nombre') || '').trim(),
                    telefono: String(datos.get('telefono') || '').trim(),
                    codigo: producto.codigo,
                    detalle: producto.detalle,
                    costo: producto.costo,
                    mayorista: producto.mayorista,
                    publico: producto.publico
                };
                Object.entries(campos).forEach(([campo, valor]) => {
                    const elemento = container.querySelector(`[data-campo="${campo}"]`);
                    if (elemento) elemento.textContent = valor;
                });
                const tablaMateriales = container.querySelector('#cotizacionMateriales');
                if (materiales.length) {
                    materiales.forEach(material => {
                        const fila = document.createElement('tr');
                        [
                            `${material.codigo} — ${material.detalle}`,
                            material.medidas,
                            material.cantidad,
                            material.valor
                        ].forEach((valor, indice) => {
                            const celda = document.createElement('td');
                            celda.className = `p-2 ${indice >= 2 ? 'text-right font-semibold' : ''}`;
                            celda.textContent = valor;
                            fila.appendChild(celda);
                        });
                        tablaMateriales.appendChild(fila);
                    });
                } else {
                    const fila = document.createElement('tr');
                    const celda = document.createElement('td');
                    celda.colSpan = 4;
                    celda.className = 'p-3 text-center text-slate-500';
                    celda.textContent = 'No se registraron materias primas.';
                    fila.appendChild(celda);
                    tablaMateriales.appendChild(fila);
                }
            } else {
                const producto = obtenerResumenCostos();
                if (!producto.codigo || !producto.detalle) {
                    showMessage('Ingresa el código y la descripción del producto.');
                    return;
                }
                container.innerHTML = `
                    <h3 class="font-bold text-emerald-900">Datos del cliente</h3>
                    <form onsubmit="generarCotizacion(event)" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-medium mb-1">Nombre completo o razón social</label>
                            <input name="nombre" type="text" autocomplete="name" required class="w-full px-3 py-2 bg-white border rounded-lg text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1">Teléfono o WhatsApp</label>
                            <input name="telefono" type="tel" required class="w-full px-3 py-2 bg-white border rounded-lg text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1">Vigencia (días)</label>
                            <input name="vigencia" type="number" min="1" step="1" value="15" required class="w-full px-3 py-2 bg-white border rounded-lg text-sm">
                        </div>
                        <div class="sm:col-span-2">
                            <button type="submit" class="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer">Confirmar y generar cotización</button>
                        </div>
                    </form>
                `;
            }
            container.classList.remove('hidden');
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function renderizarTablaPT() {
            const tbody = document.getElementById('tablaPT');
            if (!tbody) return;
            tbody.innerHTML = '';
            const sinProductos = document.getElementById('sinProductosPT');
            if (sinProductos) sinProductos.classList.toggle('hidden', inventarioPT.length > 0);
            inventarioPT.forEach(producto => {
                tbody.innerHTML += `<tr class="hover:bg-slate-50"><td class="p-2 font-mono font-bold text-indigo-600">${producto.codigo}</td><td class="p-2">${producto.detalle}</td><td class="p-2 text-right">${producto.costo}</td><td class="p-2 text-right">${producto.mayorista}</td><td class="p-2 text-right">${producto.publico}</td><td class="p-2 text-right font-bold">${producto.stock}</td></tr>`;
            });
        }

        function obtenerConfiguracionActual() {
            const materiales = [];
            for (let i = 1; i <= 8; i++) {
                const codigo = document.getElementById(`mpCodigo${i}`)?.value || '';
                const ancho = parseFloat(document.getElementById(`mpAncho${i}`)?.value) || 0;
                const largo = parseFloat(document.getElementById(`mpLargo${i}`)?.value) || 0;
                const cantidad = parseFloat(document.getElementById(`mpCant${i}`)?.value) || 0;
                if (!codigo && !ancho && !largo && !cantidad) continue;
                materiales.push({ codigo, ancho, largo, cantidad });
            }
            return {
                codigo: document.getElementById('codigoPT').value.trim().toUpperCase(),
                detalle: document.getElementById('detallePT').value.trim(),
                minutosMO: parseFloat(document.getElementById('minutosMO').value) || 0,
                cantCierre: parseFloat(document.getElementById('cantCierre').value) || 0,
                cantAlgodon: parseFloat(document.getElementById('cantAlgodon').value) || 0,
                cantDeslizador: parseFloat(document.getElementById('cantDeslizador').value) || 0,
                costoHiloNylon: parseFloat(document.getElementById('costoHiloNylon').value) || 0,
                materiales,
                costo: document.getElementById('resTotalFinal').innerText,
                mayorista: document.getElementById('resMayorista').innerText,
                publico: document.getElementById('resPublico').innerText
            };
        }

        function guardarConfiguracionProducto() {
            const producto = obtenerResumenCostos();
            if (!producto.codigo) return;
            const guardados = JSON.parse(localStorage.getItem('taller_pt_config_vla')) || {};
            guardados[producto.codigo] = obtenerConfiguracionActual();
            localStorage.setItem('taller_pt_config_vla', JSON.stringify(guardados));
        }

        function cargarConfiguracionProducto(codigo) {
            const codigoPT = String(codigo || document.getElementById('codigoPT').value || '').trim().toUpperCase();
            if (!codigoPT) return false;
            const guardados = JSON.parse(localStorage.getItem('taller_pt_config_vla')) || {};
            const config = guardados[codigoPT];
            if (!config) return false;

            document.getElementById('codigoPT').value = codigoPT;
            document.getElementById('detallePT').value = config.detalle || '';
            document.getElementById('minutosMO').value = config.minutosMO ?? 0;
            document.getElementById('cantCierre').value = config.cantCierre ?? 0;
            document.getElementById('cantAlgodon').value = config.cantAlgodon ?? 0;
            document.getElementById('cantDeslizador').value = config.cantDeslizador ?? 0;
            document.getElementById('costoHiloNylon').value = config.costoHiloNylon ?? 0;

            const materiales = Array.isArray(config.materiales) ? config.materiales : [];
            for (let i = 1; i <= 8; i++) {
                const codigoElem = document.getElementById(`mpCodigo${i}`);
                const anchoElem = document.getElementById(`mpAncho${i}`);
                const largoElem = document.getElementById(`mpLargo${i}`);
                const cantElem = document.getElementById(`mpCant${i}`);
                const material = materiales[i - 1] || {};
                if (codigoElem) codigoElem.value = material.codigo || '';
                if (anchoElem) anchoElem.value = material.ancho ?? 0;
                if (largoElem) largoElem.value = material.largo ?? 0;
                if (cantElem) cantElem.value = material.cantidad ?? 0;
            }
            calcularTodo();
            return true;
        }

        function cargarProductoPorCodigo() {
            const codigoIngresado = document.getElementById('codigoPT').value.trim().toUpperCase();
            if (!codigoIngresado) return false;
            const existe = inventarioPT.some(item => item.codigo === codigoIngresado);
            if (existe) {
                const encontrado = inventarioPT.find(item => item.codigo === codigoIngresado);
                const codigoPT = document.getElementById('codigoPT');
                if (codigoPT) codigoPT.value = encontrado.codigo;
                document.getElementById('detallePT').value = encontrado.detalle || '';
                const guardados = JSON.parse(localStorage.getItem('taller_pt_config_vla')) || {};
                const config = guardados[codigoIngresado];
                if (config) {
                    cargarConfiguracionProducto(codigoIngresado);
                    return true;
                }
            }
            const guardados = JSON.parse(localStorage.getItem('taller_pt_config_vla')) || {};
            return cargarConfiguracionProducto(codigoIngresado) || !!guardados[codigoIngresado];
        }

        function nuevaCotizacion() {
            const resultado = document.getElementById('resultadoCotizacion');
            if (resultado) {
                resultado.classList.add('hidden');
                resultado.innerHTML = '';
            }
            document.getElementById('codigoPT').value = '';
            document.getElementById('detallePT').value = '';
            for (let i = 1; i <= 8; i++) {
                const codigo = document.getElementById(`mpCodigo${i}`);
                const ancho = document.getElementById(`mpAncho${i}`);
                const largo = document.getElementById(`mpLargo${i}`);
                const cantidad = document.getElementById(`mpCant${i}`);
                if (codigo) codigo.value = '';
                if (ancho) ancho.value = 0;
                if (largo) largo.value = 0;
                if (cantidad) cantidad.value = 0;
            }
            document.getElementById('minutosMO').value = 0;
            document.getElementById('cantCierre').value = 0;
            document.getElementById('cantAlgodon').value = 0;
            document.getElementById('cantDeslizador').value = 0;
            document.getElementById('costoHiloNylon').value = 0;
            calcularTodo();
            document.getElementById('codigoPT').focus();
        }

        function registrarProductoTerminado() {
            const producto = obtenerResumenCostos();
            if (!producto.codigo || !producto.detalle) {
                showMessage('Ingresa el código y la descripción del producto.');
                return;
            }
            guardarConfiguracionProducto();
            const existente = inventarioPT.find(item => item.codigo === producto.codigo);
            if (existente) {
                existente.stock += 1;
                existente.detalle = producto.detalle;
                existente.costo = producto.costo;
                existente.mayorista = producto.mayorista;
                existente.publico = producto.publico;
            } else {
                inventarioPT.push({ ...producto, stock: 1 });
            }
            localStorage.setItem('taller_pt_vla', JSON.stringify(inventarioPT));
            renderizarTablaPT();
            showMessage(`Producto ${producto.codigo} ingresado al inventario. Existencias actualizadas.`);
        }

        function inicializarSlots() {
            const contenedor = document.getElementById('slotsMP');
            if (!contenedor) return;
            contenedor.innerHTML = '';
            for (let i = 1; i <= 8; i++) {
                contenedor.innerHTML += `
                    <div class="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center bg-slate-50 p-3 rounded-lg border text-xs">
                        <div>
                            <label class="block text-[10px] text-slate-500">Código MP ${i}</label>
                            <select id="mpCodigo${i}" onchange="calcularTodo()" class="w-full p-1.5 border rounded bg-white font-mono">
                                <option value="">Seleccionar...</option>
                                ${inventarioMP.map(m => `<option value="${m.codigo}">${m.codigo}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-500">Ancho (cm)</label>
                            <input type="number" id="mpAncho${i}" value="${i === 1 || i === 2 ? 58 : 0}" oninput="calcularTodo()" class="w-full p-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-500">Largo (cm)</label>
                            <input type="number" id="mpLargo${i}" value="${i === 1 || i === 2 ? 58 : 0}" oninput="calcularTodo()" class="w-full p-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-500">Cantidad</label>
                            <input type="number" id="mpCant${i}" value="1" oninput="calcularTodo()" class="w-full p-1.5 border rounded bg-white">
                        </div>
                        <div class="sm:col-span-2 text-right">
                            <span class="text-[10px] text-slate-500 block">Subtotal Calculado:</span>
                            <span id="mpPrecio${i}" class="text-sm font-bold text-slate-900">$0</span>
                        </div>
                    </div>
                `;
            }
            const primerSelect = document.getElementById('mpCodigo1');
            if (primerSelect) primerSelect.value = 'CERR';
            calcularTodo();
        }

        function actualizarSelectsMP() {
            for (let i = 1; i <= 8; i++) {
                const select = document.getElementById(`mpCodigo${i}`);
                if (select) {
                    const actual = select.value;
                    select.replaceChildren(new Option('Seleccionar materia prima...',''),...inventarioMP.filter(m=>!m.archived).map(m=>new Option(`${m.codigo} - ${m.detalle||'Sin detalle'}`,m.codigo)));
                    select.value = actual;
                }
            }
        }

        function formatoMoneda(valor) {
            const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0;
            return "$" + Math.round(numero).toLocaleString('es-CO');
        }

        function calcularTodo() {
            let sumaMP = 0;
            for (let i = 1; i <= 8; i++) {
                const codigoElem = document.getElementById(`mpCodigo${i}`);
                const anchoElem = document.getElementById(`mpAncho${i}`);
                const largoElem = document.getElementById(`mpLargo${i}`);
                const cantElem = document.getElementById(`mpCant${i}`);
                const precioSpan = document.getElementById(`mpPrecio${i}`);
                if (!codigoElem || !precioSpan) continue;
                const codigo = codigoElem.value;
                const ancho_cm = parseFloat(anchoElem.value) || 0;
                const largo_cm = parseFloat(largoElem.value) || 0;
                const cantidad = Number.isFinite(parseFloat(cantElem.value)) ? parseFloat(cantElem.value) : 0;
                const itemMP = inventarioMP.find(m => m.codigo === codigo);
                let precioCalculado = 0;
                if (itemMP && !['CIERRE','ALGODON','DESLIZADOR'].includes(codigo)) {
                    const area_base = (itemMP.largo / 100) * (itemMP.ancho / 100);
                    const area_ingresada = (largo_cm / 100) * (ancho_cm / 100);
                    if (area_base > 0) {
                        precioCalculado = ((area_ingresada * itemMP.precio) / area_base) * cantidad;
                    }
                }
                precioSpan.innerText = formatoMoneda(precioCalculado);
                sumaMP += precioCalculado;
            }

            const minutos = parseFloat(document.getElementById('minutosMO').value) || 0;
            const costoMO = minutos * 100;
            document.getElementById('lblCostoMO').innerText = formatoMoneda(costoMO);

            const cierreCm = parseFloat(document.getElementById('cantCierre').value) || 0;
            const mpCierre = inventarioMP.find(m => m.codigo === 'CIERRE');
            const costoCierre = cierreCm * (Number(mpCierre?.precio) || 0);
            document.getElementById('lblCostoCierre').innerText = formatoMoneda(costoCierre);

            const algodonGr = parseFloat(document.getElementById('cantAlgodon').value) || 0;
            const mpAlgodon = inventarioMP.find(m => m.codigo === 'ALGODON');
            const costoAlgodon = algodonGr * (Number(mpAlgodon?.precio) || 0);
            document.getElementById('lblCostoAlgodon').innerText = formatoMoneda(costoAlgodon);

            const deslizadorUnid = parseFloat(document.getElementById('cantDeslizador').value) || 0;
            const mpDeslizador = inventarioMP.find(m => m.codigo === 'DESLIZADOR');
            const costoDeslizador = deslizadorUnid * (Number(mpDeslizador?.precio) || 0);
            document.getElementById('lblCostoDeslizador').innerText = formatoMoneda(costoDeslizador);

            const costoHiloNylon = Math.max(0, Number(document.getElementById('costoHiloNylon')?.value) || 0);
            document.getElementById('lblCostoHiloNylon').innerText = formatoMoneda(costoHiloNylon);
            const sumaTotal = sumaMP + costoMO + costoCierre + costoAlgodon + costoDeslizador + costoHiloNylon;
            const desperdicio = sumaTotal * 0.02;
            const costoFijo = sumaTotal * 0.02;
            const totalFinal = sumaTotal + desperdicio + costoFijo;
            const precioMayor = totalFinal / (1 - 0.3);
            const precioPublico = totalFinal / (1 - 0.4);

            document.getElementById('resDesperdicio').innerText = formatoMoneda(desperdicio);
            document.getElementById('resCostoFijo').innerText = formatoMoneda(costoFijo);
            document.getElementById('resTotalFinal').innerText = formatoMoneda(totalFinal);
            document.getElementById('resMayorista').innerText = formatoMoneda(precioMayor);
            document.getElementById('resPublico').innerText = formatoMoneda(precioPublico);
        }

        function agregarMateriaPrima(e) {
            e.preventDefault();
            const nueva = {
                codigo: document.getElementById('nuevoCodigo').value.trim().toUpperCase(),
                detalle: document.getElementById('nuevoDetalle').value.trim(),
                precio: parseFloat(document.getElementById('nuevoPrecio').value) || 0,
                largo: parseFloat(document.getElementById('nuevoLargo').value) || 1,
                ancho: parseFloat(document.getElementById('nuevoAncho').value) || 1
            };
            inventarioMP.push(nueva);
            localStorage.setItem('taller_mp_vla', JSON.stringify(inventarioMP));
            actualizarSelectsMP();
            renderizarTablaMP();
            document.getElementById('formMP').reset();
            showMessage('¡Materia prima agregada con éxito!');
        }

        function renderizarTablaMP() {
            const tbody = document.getElementById('tablaMP');
            if (!tbody) return;
            tbody.innerHTML = '';
            inventarioMP.forEach(m => {
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50">
                        <td class="p-2 font-mono font-bold text-indigo-600">${m.codigo}</td>
                        <td class="p-2">${m.detalle}</td>
                        <td class="p-2 text-right font-semibold">${formatoMoneda(m.precio)}</td>
                        <td class="p-2 text-right">${m.largo}</td>
                        <td class="p-2 text-right">${m.ancho}</td>
                    </tr>
                `;
            });
        }

        function limpiarFormulario() {
            document.getElementById('codigoPT').value = '';
            document.getElementById('detallePT').value = '';
            document.getElementById('minutosMO').value = 0;
            document.getElementById('cantCierre').value = 0;
            document.getElementById('cantAlgodon').value = 0;
            document.getElementById('cantDeslizador').value = 0;
            document.getElementById('costoHiloNylon').value = 0;
            for (let i = 1; i <= 8; i++) {
                const codigo = document.getElementById(`mpCodigo${i}`);
                const ancho = document.getElementById(`mpAncho${i}`);
                const largo = document.getElementById(`mpLargo${i}`);
                const cantidad = document.getElementById(`mpCant${i}`);
                if (codigo) codigo.value = '';
                if (ancho) ancho.value = 0;
                if (largo) largo.value = 0;
                if (cantidad) cantidad.value = 0;
            }
            const cotizacion = document.getElementById('resultadoCotizacion');
            cotizacion.innerHTML = '';
            cotizacion.classList.add('hidden');
            calcularTodo();
        }

        window.onload = function() {
            inicializarSlots();
            renderizarTablaMP();
            renderizarTablaPT();
            cambiarVista('calculadora');
        };
    
