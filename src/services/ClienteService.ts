import { ClienteRepository } from "../repositories/ClienteRepository";
import { ClienteValidator } from "../validators/ClienteValidator";
import { ICreateClienteDTO, IUpdateClienteDTO } from "../types/cliente";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination";
import bcrypt from "bcryptjs";
import { CacheService } from "../utils/cache";
import { EventPublisher } from "../utils/eventPublisher"; // <-- NOVO
import { EventChannels } from "../config/events";         // <-- NOVO

export class ClienteService {
  private repository: ClienteRepository;
  private readonly CACHE_KEY_ALL = "clientes:all";
  private readonly CACHE_KEY_PREFIX = "clientes:";

  constructor() {
    this.repository = new ClienteRepository();
  }

  // ... (métodos de listagem e busca continuam iguais)
  async listarComPaginacao(page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams({ page, limit });
    const cacheKey = `clientes:paginated:${pageNum}:${limitNum}`;
    return CacheService.getOrSet(cacheKey, async () => {
      const [clientes, total] = await Promise.all([
        this.repository.findAllPaginated(skip, limitNum),
        this.repository.countAll(),
      ]);
      return formatPaginatedResponse(clientes, total, pageNum, limitNum);
    });
  }

  async listarTodos() {
    return CacheService.getOrSet(this.CACHE_KEY_ALL, () => this.repository.findAll());
  }

  async buscarPorId(id: number) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${id}`;
    return CacheService.getOrSet(cacheKey, async () => {
      const cliente = await this.repository.findById(id);
      if (!cliente) throw new Error("Cliente não encontrado");
      return cliente;
    });
  }

  async criar(data: any) {
    this.validarCriacao(data);
    await this.verificarCpfUnico(data.cpf);
    
    if (data.email) {
      await this.verificarEmailUnico(data.email);
    }

    const novoCliente = await this.repository.create(await this.montarDadosCriacao(data));
    
    await CacheService.invalidatePattern(`${this.CACHE_KEY_PREFIX}*`);
    await CacheService.invalidate(this.CACHE_KEY_ALL);

    // PUBLICA O EVENTO DE CRIAÇÃO
    await EventPublisher.publish(EventChannels.CLIENTE_CRIADO, {
      id: novoCliente.id,
      nome: novoCliente.nome,
      email: novoCliente.email,
    });

    return novoCliente;
  }

  async atualizar(id: number, data: any) {
    await this.buscarPorId(id);
    this.validarAtualizacao(data);
    
    if (data.email) {
      await this.verificarEmailUnicoAtualizacao(data.email, id);
    }

    const clienteAtualizado = await this.repository.update(id, this.montarDadosAtualizacao(data));

    await CacheService.invalidate(`${this.CACHE_KEY_PREFIX}${id}`);
    await CacheService.invalidate(this.CACHE_KEY_ALL);
    await CacheService.invalidatePattern(`clientes:paginated:*`);

    // PUBLICA O EVENTO DE ATUALIZAÇÃO
    await EventPublisher.publish(EventChannels.CLIENTE_ATUALIZADO, {
      id: clienteAtualizado.id,
      nome: clienteAtualizado.nome,
    });

    return clienteAtualizado;
  }

  async deletar(id: number) {
    const cliente = await this.buscarPorId(id);

    if (cliente.orcamentos && cliente.orcamentos.length > 0) {
      throw new Error("Não é possível excluir este cliente, pois ele possui ordens de serviço vinculadas.");
    }

    await this.repository.softDelete(id);

    await CacheService.invalidate(`${this.CACHE_KEY_PREFIX}${id}`);
    await CacheService.invalidate(this.CACHE_KEY_ALL);
    await CacheService.invalidatePattern(`clientes:paginated:*`);

    // PUBLICA O EVENTO DE DELEÇÃO
    await EventPublisher.publish(EventChannels.CLIENTE_DELETADO, {
      id,
      nome: cliente.nome,
    });

    return { message: "Cliente deletado com sucesso" };
  }

  // ... (métodos auxiliares continuam iguais)
  private validarCriacao(data: ICreateClienteDTO) { ClienteValidator.validateCreate(data); }
  private validarAtualizacao(data: IUpdateClienteDTO) { ClienteValidator.validateUpdate(data); }
  private async verificarCpfUnico(cpf?: string) {
    if (!cpf) return;
    const existe = await this.repository.findByCpf(cpf);
    if (existe) throw new Error("CPF já cadastrado");
  }
  private async verificarEmailUnico(email: string) {
    const existe = await this.repository.findByEmail(email);
    if (existe) throw new Error("E-mail já cadastrado");
  }
  private async verificarEmailUnicoAtualizacao(email: string, id: number) {
    const existe = await this.repository.findByEmail(email);
    if (existe && existe.id !== id) throw new Error("E-mail já cadastrado");
  }
  private async montarDadosCriacao(data: any) {
    const senhaHash = data.senha ? await bcrypt.hash(data.senha, 10) : null;
    return {
      nome: data.nome, telefone: data.telefone || null, cpf: data.cpf || null,
      cnh: data.cnh || null, email: data.email || null, senha: senhaHash,                
      permissao: 'CLIENTE', ativo: true                      
    };
  }
  private montarDadosAtualizacao(data: any) {
    return {
      nome: data.nome, telefone: data.telefone, email: data.email, 
      atualizado_em: new Date(),
    };
  }
}