import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Graph Study · LangChain & LangGraph 学习工作台",description:"Python 进阶学习：六周路线、24 个任务、实战验收、自测与学习笔记。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
