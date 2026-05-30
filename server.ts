import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin client with service role key
console.log("Initializing Supabase Admin Client...");
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Check if keys are actually present
if (!supabaseServiceKey) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!");
}
if (!supabaseUrl) {
  console.error("FATAL: VITE_SUPABASE_URL is missing from environment variables!");
}

// Middleware to verify if the requester is the master admin
const verifyMasterAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (user.email !== 'adminnovo@gmail.com') {
      return res.status(403).json({ error: "Forbidden: Not master admin" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error during auth" });
  }
};

// API route to change user password (Master Admin only)
app.post("/api/admin/change-password", verifyMasterAdmin, async (req, res) => {
  const { userId, newPassword } = req.body;
  console.log(`Solicitação de alteração de senha para ID: ${userId}`);

  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User ID and new password are required" });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: "Configuração do servidor incompleta: Chave de serviço Admin não encontrada." });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Erro ao alterar senha no Auth:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log("Senha alterada com sucesso.");
    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err: any) {
    console.error("Erro na rota change-password:", err);
    res.status(500).json({ error: err.message || "Erro ao alterar senha" });
  }
});

// API route to delete user (Master Admin only)
app.post("/api/admin/delete-user", verifyMasterAdmin, async (req, res) => {
  const { userId } = req.body;
  console.log(`Solicitação de remoção por ID: ${userId}`);

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: "Configuração do servidor incompleta: Chave de serviço Admin não encontrada." });
  }

  try {
    console.log("Removendo do Supabase Auth...");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Erro ao deletar do Auth:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log("Remoção concluída com sucesso.");
    res.json({ message: "Usuário removido da autenticação com sucesso!" });
  } catch (err: any) {
    console.error("Erro na rota delete-user:", err);
    res.status(500).json({ error: err.message || "Erro ao remover usuário" });
  }
});

// API route to delete user by email (Master Admin only)
app.post("/api/admin/delete-user-by-email", verifyMasterAdmin, async (req, res) => {
  const { email } = req.body;
  console.log(`Solicitação de remoção manual por e-mail: ${email}`);

  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório" });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: "Configuração do servidor incompleta: Chave de serviço Admin não encontrada." });
  }

  try {
    let targetUser = null;
    let page = 1;
    const perPage = 1000; 

    // Loop through users to find the one with this email (Supabase admin listUsers is paginated)
    console.log("Buscando usuário no Auth...");
    while (true) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });

      if (listError) {
        console.error("Erro ao listar usuários:", listError);
        throw listError;
      }
      if (users.length === 0) break;

      const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (found) {
        targetUser = found;
        console.log(`Usuário encontrado no Auth: ${targetUser.id}`);
        break;
      }

      if (users.length < perPage) break;
      page++;
    }

    if (!targetUser) {
      console.log("Usuário não encontrado no Auth, tentando limpar apenas tabela profiles...");
      // Even if not in Auth, try to delete from profiles table just in case
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('email', email.toLowerCase());
      
      if (profileError) console.error("Erro ao limpar profile:", profileError);

      return res.status(404).json({ 
        error: "Usuário não encontrado no Supabase Autenticação.",
        profileCleaned: !profileError 
      });
    }

    // Delete from profiles table first
    console.log(`Limpando tabela profiles para ID: ${targetUser.id}`);
    const { error: profileDelError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetUser.id);
    
    if (profileDelError) console.error("Erro ao deletar profile:", profileDelError);

    // Then delete from Auth
    console.log("Removendo do Supabase Auth...");
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);

    if (deleteError) {
      console.error("Erro ao deletar do Auth:", deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    console.log("Remoção concluída com sucesso.");
    res.json({ message: `Conta ${email} removida com sucesso de todas as tabelas!` });
  } catch (err: any) {
    console.error("Erro na rota delete-user-by-email:", err);
    res.status(500).json({ error: err.message || "Erro ao remover usuário por e-mail" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
