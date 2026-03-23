import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword } from "../src/lib/security/password";

const prisma = new PrismaClient();

function readArgument(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function requireArgument(flag: string, label: string) {
  const value = readArgument(flag);

  if (!value || value.trim() === "") {
    throw new Error(`Informe ${label} usando ${flag}.`);
  }

  return value.trim();
}

function resolveRole(value: string) {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "admin":
    case "saf_admin":
      return UserRole.SAF_ADMIN;
    case "operador":
    case "operator":
    case "saf_operador":
      return UserRole.SAF_OPERADOR;
    case "viewer":
    case "leitura":
    case "read":
    case "readonly":
    case "saf_leitura":
      return UserRole.SAF_LEITURA;
    default:
      throw new Error(
        "Role interna invalida. Use --role admin, --role operador ou --role viewer.",
      );
  }
}

function buildDefaultName(role: UserRole, email: string) {
  const emailPrefix = email.split("@")[0] || "usuario";

  switch (role) {
    case UserRole.SAF_ADMIN:
      return `SAF Admin - ${emailPrefix}`;
    case UserRole.SAF_OPERADOR:
      return `SAF Operador - ${emailPrefix}`;
    case UserRole.SAF_LEITURA:
      return `Central Viewer - ${emailPrefix}`;
    default:
      return emailPrefix;
  }
}

async function main() {
  const email = requireArgument("--email", "o e-mail interno");
  const password = requireArgument("--password", "a senha interna");
  const role = resolveRole(requireArgument("--role", "o perfil interno"));
  const name = readArgument("--name")?.trim() || buildDefaultName(role, email);
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role,
      isActive: true,
    },
    create: {
      email,
      name,
      passwordHash,
      role,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  console.log(
    `[internal-user] acesso configurado com sucesso | email=${user.email} | role=${user.role} | ativo=${user.isActive}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
