import { translations } from "./translations";
import { useAppState } from "./hooks/useAppState";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { ShiftForm } from "./components/ShiftForm/ShiftForm";
import { SettingsView } from "./components/Settings/SettingsView";
import { ReportsView } from "./components/Reports/ReportsView";
import { StatsView } from "./components/StatsView";
import { LoginView } from "./components/Auth/LoginView";
import { RegisterView } from "./components/Auth/RegisterView";
import { LoadingView } from "./components/LoadingView";
import { AdminView } from "./components/Admin/AdminView";
import { Sidebar } from "./components/Sidebar";
import { MobileNav, MobileFab } from "./components/MobileNav";
import { SessionExpiredModal } from "./components/Settings/SessionExpiredModal";

function App() {
  const {
    auth, tx, activeView, isFormOpen, prefilledDate, editingTransaction,
    insight, profile, isAdmin, settings, isLoading,
    handleAddTransaction, openForm, closeForm, handleViewChange,
    handleUpdateProfile, handleUpdateSettings,
  } = useAppState();

  const t = translations[settings.language];

  if (!auth.isAuthenticated) {
    if (activeView === "registro") {
      return (
        <RegisterView
          onRegister={auth.handleRegister}
          onBackToLogin={() => handleViewChange("login")}
          error={auth.registerError}
          isLoading={auth.authLoading}
          settings={settings}
          successMessage={auth.registerSuccess ? "ok" : undefined}
        />
      );
    }
    return (
      <LoginView
        onLogin={auth.handleLogin}
        loginError={auth.loginError}
        isLoading={auth.authLoading}
        settings={settings}
        onNavigateToRegister={() => handleViewChange("registro")}
      />
    );
  }

  if (isLoading) {
    return <LoadingView settings={settings} />;
  }

  return (
    <div
      className={`min-h-screen font-sans flex flex-col lg:flex-row transition-colors duration-300 ${settings.darkMode ? "bg-slate-950 text-slate-100 dark" : "bg-sky-200 text-[#1E293B]"}`}
    >
      <Sidebar
        activeView={activeView}
        isAdmin={isAdmin}
        insight={insight}
        onNavigate={handleViewChange}
        onLogout={auth.handleLogout}
        labels={{ inicio: t.inicio, guardias: t.guardias || "Guardias", ajustes: t.ajustes }}
      />

      <main className="flex-1 flex flex-col relative pb-32 lg:pb-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeView === "inicio" && (
            <Dashboard
              transactions={tx.transactions}
              insight={insight}
              onOpenForm={() => openForm()}
              onViewReports={() => handleViewChange("reportes")}
              onUpdateTransaction={tx.handleUpdateTransaction}
              userProfile={profile}
              settings={settings}
            />
          )}
          {activeView === "reportes" && (
            <ReportsView
              transactions={tx.transactions}
              settings={settings}
              profile={profile}
              onBack={() => handleViewChange("inicio")}
              onOpenForm={(date, t) => openForm(date, t)}
              onEdit={(t) => openForm(undefined, t)}
              onDelete={tx.handleDeleteTransaction}
              onUpdate={tx.handleUpdateTransaction}
            />
          )}
          {activeView === "stats" && (
            <StatsView
              settings={settings}
              onBack={() => handleViewChange("inicio")}
            />
          )}
          {activeView === "perfil" && (
            <SettingsView
              profile={profile}
              settings={settings}
              isAdmin={isAdmin}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
          {activeView === "admin" && (
            <AdminView
              settings={settings}
              onBack={() => handleViewChange("inicio")}
            />
          )}
        </div>

        <MobileFab
          visible={["inicio", "reportes"].includes(activeView)}
          onClick={() => openForm()}
        />

        <MobileNav
          activeView={activeView}
          onNavigate={handleViewChange}
          onLogout={auth.handleLogout}
          labels={{ inicio: t.inicio, turnos: t.guardias, estadisticas: t.estadisticas, ajustes: t.ajustes }}
        />
      </main>

      {isFormOpen && (
        <ShiftForm
          onClose={closeForm}
          onSubmit={handleAddTransaction}
          initialDate={prefilledDate}
          editingTransaction={editingTransaction || undefined}
          transactions={tx.transactions}
          settings={settings}
          institutions={tx.institutions}
          onInstitutionChange={tx.handleInstitutionChange}
          onInstitutionDelete={tx.handleInstitutionDelete}
        />
      )}

      {auth.sessionExpired && (
        <SessionExpiredModal
          onReLogin={() => { auth.handleLogout(); auth.dismissSessionExpired(); }}
        />
      )}
    </div>
  );
}

export default App;
