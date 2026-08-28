export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/network|fetch/i.test(message)) return 'Sem conexão. Verifique a internet e tente novamente.';
  if (/invalid login/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(message)) return 'Este e-mail já está cadastrado.';
  return 'Não foi possível concluir a ação. Tente novamente.';
}

