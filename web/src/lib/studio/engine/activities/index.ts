import { ExecutionContext } from "../Context";

export type ActivityExecutor = (node: any, context: ExecutionContext) => Promise<any>;

export const activities: Record<string, ActivityExecutor> = {
  "HTTP Request": async (node, context) => {
    const { url, method = "GET", headers = {}, body = null } = node.data.inputs || {};
    if (!url) throw new Error("URL is required for HTTP Request");
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    
    const data = await response.json();
    const outputVar = node.data.outputs?.result;
    if (outputVar) context.set(outputVar, data);
    
    return data;
  },

  "Log Message": async (node, context) => {
    const { message, logLevel = "Info" } = node.data.inputs || {};
    console.log(`[${logLevel}] ${message}`);
    return message;
  },

  "Assign": async (node, context) => {
    const { to, value } = node.data.inputs || {};
    context.set(to, value);
    return value;
  },

  "Condition": async (node, context) => {
    const { condition } = node.data.inputs || {};
    // Simply evaluate the condition as a predicate
    return !!condition;
  }
};
