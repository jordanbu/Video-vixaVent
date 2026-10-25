// ES dictionary (extra): key = Chinese original text, value = Spanish.
export default {
  "媒体存储": "Almacenamiento de media",
  "工程与素材的本地保存目录，与可选的 R2 云备份。": "Carpetas locales para proyectos y media, con respaldo opcional en R2.",
  "工程存储目录": "Carpeta de proyectos",
  "桌面端默认把素材存入系统应用数据目录，浏览器开发版默认使用 public/media/uploads/。可选择任意本机目录或外置硬盘；保存后旧目录中的素材会复制到新目录（原文件保留），工程里的素材地址不变，预览与渲染导出都会跟随新目录。": "La app de escritorio guarda la media en la carpeta de datos de la app del sistema; la versión de desarrollo en el navegador usa public/media/uploads/. Puedes elegir cualquier carpeta del equipo o un disco externo; al guardar, la media de la carpeta anterior se copia a la nueva (los originales se conservan), las direcciones de la media en el proyecto no cambian y la vista previa, el render y la exportación usan la carpeta nueva.",
  "素材保存目录": "Carpeta donde se guarda la media",
  "桌面端点击“选择目录”；浏览器中也可手动输入绝对路径。清除后回到当前运行环境的默认目录。": "En el escritorio haz clic en “Elegir carpeta”; en el navegador también puedes escribir una ruta absoluta. Bórrala para volver a la carpeta predeterminada del entorno actual.",
  "内置 Agent 需要 Anthropic API Key。Claude Code 订阅用户请通过「外部 Agent 接入 (MCP)」连接；Vixaventora 不接收 Claude OAuth。": "El agente integrado necesita una API key de Anthropic. Si tienes suscripción a Claude Code, conéctate desde “Agentes externos (MCP)”; Vixaventora no recibe OAuth de Claude.",
  "工程、历史版本与素材的存放位置。默认放在应用数据目录里；改到你自己的目录（外置硬盘、同步盘）后，卸载或重装应用都不会动到作品。保存时会把现有数据复制到新目录（原目录保留不删），重启应用后生效。": "Dónde se guardan los proyectos, el historial de versiones y la media. Por defecto va en la carpeta de datos de la app; si la cambias a una carpeta tuya (disco externo, carpeta sincronizada), desinstalar o reinstalar la app no toca tus trabajos. Al guardar se copian los datos existentes a la nueva carpeta (la original no se borra); aplica al reiniciar la app.",
  "中文词级转写 · 本地模型 · 该轨共 {n} 段会逐段转写（免费、离线、素材不出本机）。转写后可点词删减（删词=剪音频）。": "Transcripción en chino palabra por palabra · modelo local · los {n} clips de esta pista se transcriben uno por uno (gratis, sin conexión, la media no sale de la máquina). Después puedes hacer clic en las palabras para cortarlas (borrar una palabra = cortar el audio).",
  "中文词级转写 · 说话人分离 · 该轨共 {n} 段会逐段上传。转写后可点词删减（删词=剪音频）。": "Transcripción en chino palabra por palabra · separación de hablantes · los {n} clips de esta pista se suben uno por uno. Después puedes hacer clic en las palabras para cortarlas (borrar una palabra = cortar el audio).",
  "问答模式": "Modo preguntas",
  "只回答，不动时间线": "Solo responde, no toca la línea de tiempo",
} as Record<string, string>;
