import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Graph Study · LangChain & LangGraph 学习工作台",description:"Python 学习路线：12 周、48 个任务，包含 LangGraph 基础与高阶真实 API 练习、实战验收、自测与学习笔记。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
