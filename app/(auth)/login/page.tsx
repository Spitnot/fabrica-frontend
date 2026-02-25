'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setError('');
    setLoading(true);

    // 1. Autenticar con Supabase
    const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      setLoading(false);
      return;
    }

    // 2. Leer el rol desde user_metadata
    const role = data.user.user_metadata?.role as string | undefined;

    if (!role) {
      setError('Este usuario no tiene un rol asignado. Contacta al administrador.');
      setLoading(false);
      return;
    }

    // 3. Redirigir según rol
    if (role === 'admin') {
      router.push('/dashboard');
    } else if (role === 'customer') {
      router.push('/portal');        // panel del cliente (lo crearemos después)
    } else {
      setError(`Rol desconocido: ${role}. Contacta al administrador.`);
      setLoading(false);
    }

    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] relative overflow-hidden">

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, #282828 39px, #282828 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, #282828 39px, #282828 40px)
          `,
        }}
      />
      {/* Amber glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 40% 60%, rgba(245,158,11,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Card */}
      <div className="relative w-[380px] bg-[#141414] border border-[#333] rounded-xl p-10 shadow-2xl">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-medium">
            Sistema de Gestión
          </div>
          <div className="text-3xl font-semibold tracking-tight mt-1 text-zinc-200">
            Fábrica<span className="text-amber-400">.</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-950 border border-red-900 rounded-md text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="admin@fabrica.com"
              className="w-full bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 outline-none transition-colors"
            />
          </div>

          <div className="pt-1">
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-amber-400 text-black text-sm font-bold rounded-md hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          Panel interno · Solo administradores
        </p>
      </div>
    </div>
  );
}
