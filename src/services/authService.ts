import prisma from "../prisma/prismaClient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validarEmail } from "../utils/validators";
import { executeWithResilience } from "../utils/resilience"; // <-- Importação da resiliência
import { logger } from "../utils/logger";

export const login = async (email: string, senha: string) => {
  if (!validarEmail(email)) {
    throw new Error("Email inválido");
  }

  let conta: any = null;
  let isCliente = false;

  // 1 e 2. Busca no banco de dados com Resiliência (Timeout, Retry e Circuit Breaker)
  // Se o banco demorar mais que 5s, a requisição é abortada. Se falhar, tenta 3 vezes.
  conta = await executeWithResilience(
    async () => {
      // Tenta buscar na tabela de ADMINISTRADORES
      let usuarioEncontrado = await prisma.usuarios.findUnique({
        where: { email }
      });

      // Se não achar, busca na tabela de CLIENTES
      if (!usuarioEncontrado) {
        usuarioEncontrado = await prisma.clientes.findUnique({
          where: { email }
        });
        if (usuarioEncontrado) isCliente = true;
      }

      return usuarioEncontrado;
    },
    "BuscaLogin_Prisma" // Nome da operação para aparecer nos logs e métricas
  );

  // Se não achou em nenhuma das duas, barra o acesso
  if (!conta) {
    throw new Error("Email ou senha inválidos");
  }

  if (conta.ativo === false) {
    throw new Error("Usuário desativado. Contate o administrador.");
  }

  if (!conta.senha) {
    throw new Error("Usuário sem senha cadastrada");
  }

  // Compara a senha digitada com o hash do banco
  const senhaValida = await bcrypt.compare(senha, conta.senha);

  if (!senhaValida) {
    throw new Error("Email ou senha inválidos");
  }

  // Garante a permissão correta no Token
  const permissao = conta.permissao || (isCliente ? 'CLIENTE' : 'ADMIN');

  // Segurança: Exige que a variável de ambiente exista
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('ERRO CRÍTICO: JWT_SECRET não configurado.');
    throw new Error("Erro interno de configuração do servidor");
  }

  const token = jwt.sign(
    {
      id: conta.id,
      email: conta.email,
      permissao: permissao,
    },
    secret,
    { expiresIn: "1d" }
  );

  // Remove a senha antes de retornar para o front-end
  const { senha: _, ...contaSemSenha } = conta;

  return {
    usuario: contaSemSenha,
    token,
  };
};