# Backups

A tela **Backups** permite escolher uma pasta pelo diálogo do sistema, gerar uma cópia manual do banco SQLite e configurar o prazo do aviso. O padrão é 7 dias. A pasta e os dados do último backup concluído são persistidos no banco ativo pela migração `0006`.

O arquivo usa a hora local: `backup-AAAA-MM-DD-HH-mm.db`. Nomes existentes recebem sufixos `-1`, `-2`, etc., sem sobrescrita. O serviço utiliza a API de backup do SQLite para incluir dados confirmados em WAL, grava uma cópia temporária na pasta escolhida e a publica com cópia exclusiva. Essa publicação também funciona em sistemas de arquivos removíveis que não suportam hard links. Temporários são removidos ao finalizar a tentativa. A data UTC é registrada somente após a conclusão; a interface exibe o horário local.

O Dashboard avisa imediatamente quando não há backup registrado, ou quando o último tem mais de X períodos de 24 horas. Atualiza a consulta ao entrar na tela, recuperar o foco, clicar em Atualizar e a cada minuto. O aviso considera o registro do aplicativo; não monitora a existência posterior do arquivo nem reconhece cópias feitas por outras ferramentas.

Erros de pasta, espaço ou permissão não avançam a data. Se a cópia for concluída e o registro no banco falhar, a mensagem informa o caminho criado e preserva a data anterior. O processo principal impede operações simultâneas. Não há restauração, agendamento ou exclusão automática nesta versão.

Validação: `npm test`, `npm run build` e `npm run test:ui:backups` (requer ambiente gráfico). Os testes do serviço usam banco real em WAL e verificam os registros e `PRAGMA integrity_check`; o harness Electron exercita renderer, preload e IPC com respostas controladas, sem abrir o diálogo nativo.
