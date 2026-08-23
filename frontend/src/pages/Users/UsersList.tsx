import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { getUsers, updateUser, type User } from "../../api/users";
import UserForm from "./UserForm";
import ChangePasswordModal from "./ChangePasswordModal";
import { useAuthStore } from "../../store/authStore";
import ExportDropdown from "../../components/ExportDropdown";
import { type ExportColumn } from "../../utils/exportUtils";

const USERS_COLUMNS: ExportColumn<User>[] = [
  { header: "ID", accessor: "id_usuario" },
  { header: "Nombre", accessor: "nombre" },
  { header: "Usuario", accessor: "usuario" },
  { header: "Correo Electrónico", accessor: "correo" },
  { header: "Teléfono", accessor: row => row.telefono || "N/A" },
  { header: "Rol Asignado", accessor: row => row.rol?.nombre || "Sin Rol" },
  { header: "Estado Cuenta", accessor: row => (row.activo ? "Activo" : "Inactivo") },
  { header: "En Línea", accessor: row => (row.en_linea ? "Conectado" : "Desconectado") },
  { header: "Última Conexión", accessor: row => (row.ultima_conexion ? new Date(row.ultima_conexion).toLocaleString("es-GT") : "Nunca") }
];

const UsersList: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [registeredUser, setRegisteredUser] = useState<{ nombre: string; usuario: string; correo: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const adminUsers = users
    .filter((u) => u.rol.nombre === "Superadministrador" || u.rol.nombre === "Gerente")
    .sort((a, b) => a.id_usuario - b.id_usuario);
  const protectedAdminIds = adminUsers.slice(0, 2).map((u) => u.id_usuario);

  const requiresKey = (targetUser: User | null) => {
    if (!targetUser || !currentUser) return false;
    if (currentUser.id === targetUser.id_usuario) return false;
    return protectedAdminIds.includes(targetUser.id_usuario);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      user.nombre.toLowerCase().includes(term) ||
      user.correo.toLowerCase().includes(term) ||
      user.usuario.toLowerCase().includes(term)
    );
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError("Error al cargar los usuarios");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleTogglePermitirCambio = async (user: User) => {
    const newValue = !(user.permitir_cambio_password ?? true);
    setUsers(prev => prev.map(u => u.id_usuario === user.id_usuario ? { ...u, permitir_cambio_password: newValue } : u));
    try {
      await updateUser(user.id_usuario, {
        permitir_cambio_password: newValue
      });
      await loadUsers();
    } catch (err: any) {
      console.error("Error al actualizar el permiso de cambio de contraseña:", err);
      const serverMsg = err.response?.data?.error || err.message || "Error al actualizar en la base de datos";
      alert(serverMsg);
      await loadUsers();
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Administración de Usuarios</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión de accesos, políticas de seguridad y conexión en tiempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportDropdown
            data={filteredUsers}
            columns={USERS_COLUMNS}
            filename={`Reporte_Usuarios_MyVektor_${new Date().toISOString().split("T")[0]}`}
            sheetName="Usuarios"
            modulo="Usuarios"
          />

          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors font-medium text-sm flex items-center gap-2"
          >
            <span>Agregar Usuario</span>
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar-light">
        <table className="min-w-[1100px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">Usuario</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[220px]">Correo & Rol</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">Teléfono</th>
              <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[130px]">Cambio Clave</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[180px]">Último Cambio Clave</th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[120px]">Estado</th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {currentItems.map((user) => (
              <tr key={user.id_usuario} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="relative flex-shrink-0 h-10 w-10">
                      {user.foto_url ? (
                        <img
                          src={user.foto_url}
                          alt={user.nombre}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-xs"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          user.en_linea ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                        title={user.en_linea ? "Conectado" : "Desconectado"}
                      ></span>
                    </div>
                    <div className="ml-3">
                      <div className="font-bold text-gray-900">{user.nombre}</div>
                      <div className="text-xs text-gray-500">@{user.usuario}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900 font-medium">{user.correo}</div>
                  <div className="text-xs text-blue-600 font-semibold">{user.rol.nombre}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700 font-medium">
                  {user.telefono || <span className="text-gray-400 italic">Sin registrar</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <input
                    type="checkbox"
                    checked={user.permitir_cambio_password ?? true}
                    onChange={() => handleTogglePermitirCambio(user)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    title={user.permitir_cambio_password ? "Cambio de contraseña permitido" : "Cambio de contraseña restringido"}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                  {user.ultimo_cambio_password ? (
                    <div>
                      <div className="font-medium text-gray-800">
                        {new Date(user.ultimo_cambio_password).toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" })}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(user.ultimo_cambio_password).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Sin registro</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center">
                    <span className={`mr-1.5 ${user.activo ? 'text-green-500' : 'text-red-500'}`}>●</span>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 font-semibold">Editar</button>
                  <button
                    onClick={() => handleChangePassword(user)}
                    disabled={!user.permitir_cambio_password}
                    className={`font-semibold ${user.permitir_cambio_password ? "text-amber-600 hover:text-amber-800" : "text-gray-300 cursor-not-allowed"}`}
                    title={!user.permitir_cambio_password ? "Cambio de contraseña restringido para este usuario" : "Cambiar contraseña"}
                  >
                    Contraseña
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      {users.length > 0 && filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-4 py-3 bg-white rounded-lg shadow border-t border-gray-100 gap-4">
          <div className="text-sm text-gray-500 font-medium order-3 sm:order-1">
            Mostrando <span className="font-bold text-gray-700">{indexOfFirstItem + 1}</span> a{" "}
            <span className="font-bold text-gray-700">
              {Math.min(indexOfLastItem, totalItems)}
            </span>{" "}
            de <span className="font-bold text-gray-700">{totalItems}</span> usuarios
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 order-1 sm:order-2">
            {/* Anterior */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`flex items-center space-x-1 px-2.5 py-1 text-sm font-bold transition-colors select-none ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-[#1b75bb] hover:underline"
              }`}
            >
              <span>&lt; Anterior</span>
            </button>

            {/* Números de página */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isActive = page === currentPage;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 text-sm font-bold transition-all rounded select-none ${
                      isActive
                        ? "border border-[#3bc0d9] text-[#1b75bb] bg-[#edf8fc]"
                        : "text-[#1b75bb] hover:underline"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Siguiente */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`flex items-center space-x-1 px-2.5 py-1 text-sm font-bold transition-colors select-none ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-[#1b75bb] hover:underline"
              }`}
            >
              <span>Siguiente &gt;</span>
            </button>
          </div>

          <div className="flex items-center order-2 sm:order-3">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
              className="bg-transparent text-[#1b75bb] font-bold text-sm border-none outline-none focus:ring-0 focus:outline-none cursor-pointer pr-8"
            >
              <option value={10}>10 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
        </div>
      )}

      {isFormOpen && (
        <UserForm 
          user={selectedUser} 
          onClose={() => setIsFormOpen(false)} 
          requireAdminKey={requiresKey(selectedUser)}
          onSuccess={(info) => {
            setIsFormOpen(false);
            loadUsers();
            if (info) {
              setRegisteredUser(info);
            }
          }}
        />
      )}

      {isPasswordModalOpen && selectedUser && (
        <ChangePasswordModal 
          userId={selectedUser.id_usuario} 
          requireAdminKey={requiresKey(selectedUser)}
          onClose={() => setIsPasswordModalOpen(false)} 
        />
      )}

      {registeredUser && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto custom-scrollbar-light"
          onClick={() => setRegisteredUser(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center relative max-h-[90vh] overflow-y-auto custom-scrollbar-light"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4 animate-bounce">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Usuario Registrado!</h3>
            <p className="text-sm text-gray-500 mb-6">El usuario ha sido creado exitosamente en el sistema.</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2 border border-gray-100">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block text-gray-500">Nombre Completo</span>
                <span className="text-sm font-bold text-gray-800">{registeredUser.nombre}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider block text-gray-500">Usuario</span>
                  <span className="text-sm font-bold text-blue-600">@{registeredUser.usuario}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider block text-gray-500">Correo</span>
                  <span className="text-sm font-semibold text-gray-700 break-all">{registeredUser.correo}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setRegisteredUser(null)}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UsersList;
