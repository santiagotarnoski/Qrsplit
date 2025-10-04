'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QrCode, Zap, Lock, Users, ArrowRight, CheckCircle, Wallet, TrendingUp } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a254010_1px,transparent_1px),linear-gradient(to_bottom,#0a254010_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="flex justify-center gap-3 mb-8">
            <Badge 
              className="bg-green-500/10 text-green-400 border-green-500/20 px-4 py-1.5"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'all 0.6s ease-out 0.2s'
              }}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              Real-time ON
            </Badge>
            <Badge 
              className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-4 py-1.5"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'all 0.6s ease-out 0.3s'
              }}
            >
              <Wallet className="w-3 h-3 mr-2" />
              Blockchain Ready
            </Badge>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center mb-6">
              <div 
                className="relative"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-180deg)',
                  transition: 'all 1s ease-out 0.4s'
                }}
              >
                <QrCode className="w-20 h-20 text-emerald-400" strokeWidth={1.5} />
                <div className="absolute inset-0 bg-emerald-400/20 blur-xl" />
              </div>
            </div>
            
            <h1 
              className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 1s ease-out 0.6s'
              }}
            >
              QRSplit
            </h1>
            
            <p 
              className="text-3xl md:text-4xl font-semibold text-white mb-4"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 1s ease-out 0.8s'
              }}
            >
              Divide cuentas. Garantiza pagos. On-chain.
            </p>
            
            <p 
              className="text-xl text-slate-300 max-w-2xl mx-auto"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 1s ease-out 1s'
              }}
            >
              Escanea, divide, paga - Instantáneo y justo
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <Link href="/app">
              <Button 
                size="lg"
                className="group relative bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-12 py-6 text-lg shadow-2xl shadow-emerald-500/50 transition-all hover:shadow-emerald-500/70 hover:scale-105"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'scale(1)' : 'scale(0.8)',
                  transition: 'all 0.8s ease-out 1.2s'
                }}
              >
                <span className="flex items-center gap-3">
                  Abrir QRSplit App
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div 
              className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-lg p-6"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'all 0.8s ease-out 1.4s'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <h3 className="font-semibold text-white">Sin registro requerido</h3>
              </div>
              <p className="text-sm text-slate-400">Escanea el QR y listo. No necesitas crear cuenta ni compartir datos personales.</p>
            </div>
            
            <div 
              className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'all 0.8s ease-out 1.5s'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <h3 className="font-semibold text-white">Pagos garantizados on-chain</h3>
              </div>
              <p className="text-sm text-slate-400">Smart contracts aseguran que todos paguen o nadie paga. Sin deudas pendientes.</p>
            </div>
            
            <div 
              className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-6"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'all 0.8s ease-out 1.6s'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <h3 className="font-semibold text-white">Splits automáticos</h3>
              </div>
              <p className="text-sm text-slate-400">El cálculo se hace en tiempo real. Todos ven los cambios instantáneamente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              ¿Por qué QRSplit?
            </h2>
            <p className="text-xl text-slate-400">
              La única app de pagos grupales con garantía blockchain
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <QrCode className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  QR Sharing
                </h3>
                <p className="text-slate-400 mb-4">
                  Únete a sesiones escaneando un código QR. Sin registros, sin fricciones.
                </p>
                <div className="flex items-center text-emerald-400 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Instantáneo
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  Real-time Splits
                </h3>
                <p className="text-slate-400 mb-4">
                  Cálculo automático instantáneo. Todos ven los cambios en tiempo real.
                </p>
                <div className="flex items-center text-purple-400 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Socket.io Sync
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  Pagos Atómicos
                </h3>
                <p className="text-slate-400 mb-4">
                  Todos pagan simultáneamente o la transacción falla. Sin deudas pendientes.
                </p>
                <div className="flex items-center text-cyan-400 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Smart Contracts
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Cómo Funciona
            </h2>
            <p className="text-xl text-slate-400">
              Tres pasos simples para pagos grupales garantizados
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-2xl shadow-emerald-500/50">
                    1
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-white text-center mb-3">
                  Crea Sesión
                </h3>
                <p className="text-slate-400 text-center">
                  Genera un QR code único para tu grupo. Comparte instantáneamente.
                </p>
              </div>

              <div className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-emerald-500" />
              </div>

              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-2xl shadow-purple-500/50">
                    2
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-white text-center mb-3">
                  Agrega Items
                </h3>
                <p className="text-slate-400 text-center">
                  Todos agregan lo que consumieron. El split se calcula automáticamente.
                </p>
              </div>

              <div className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-purple-500" />
              </div>

              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-2xl shadow-cyan-500/50">
                    3
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-white text-center mb-3">
                  Pago Blockchain
                </h3>
                <p className="text-slate-400 text-center">
                  Conecta wallet. Ejecuta pago atómico. Todos pagan o nadie paga.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-slate-800/80 border-purple-500/30 backdrop-blur-sm shadow-2xl shadow-purple-500/20">
            <CardContent className="p-12">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    El Diferenciador Clave
                  </h3>
                  <p className="text-xl text-slate-300 mb-6">
                    A diferencia de <span className="text-purple-400 font-semibold">Splitwise</span> y otras apps tradicionales que solo <span className="italic">calculan</span> quién debe qué, <span className="text-emerald-400 font-semibold">QRSplit ejecuta pagos atómicos on-chain</span> que garantizan que todos paguen simultáneamente.
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                      <div>
                        <div className="font-semibold text-white mb-1">Apps Tradicionales</div>
                        <div className="text-sm text-slate-400">Solo calculan deudas. No garantizan pagos.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                      <div>
                        <div className="font-semibold text-white mb-1">QRSplit</div>
                        <div className="text-sm text-slate-400">Smart contracts atómicos. Pagos garantizados.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Listo para Dividir y Pagar
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Únete a la revolución de pagos grupales descentralizados
          </p>
          <Link href="/app">
            <Button 
              size="lg"
              className="group relative bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-12 py-6 text-lg shadow-2xl shadow-emerald-500/50 transition-all hover:shadow-emerald-500/70 hover:scale-105"
            >
              <span className="flex items-center gap-3">
                Abrir QRSplit App
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-slate-400 text-sm">
              QRSplit v3.0 - Blockchain MVP para Starknet Hackathon
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                QR Sharing
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                Real-time Splits
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                Smart Contracts
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}