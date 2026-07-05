"""
rag_chain.py -- Groq LLM + TF-IDF retrieval
"""
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.config import settings
from app.services.vector_store import similarity_search

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly \
based on the provided context from uploaded PDF documents.

Rules:
- Answer only from the context below. Do not use outside knowledge.
- If the answer is not in the context, say: "I couldn't find that in the uploaded documents."
- Be concise and accurate.
- When quoting, mention the source document name.

Context:
{context}
"""

PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{question}"),
])


def _fmt(docs) -> str:
    return "\n\n---\n\n".join(
        f"[{d.metadata.get('source','?')} p.{d.metadata.get('page',0)+1}]\n{d.page_content}"
        for d in docs
    )


def _llm(streaming=False):
    return ChatGroq(
        model=settings.groq_model,
        groq_api_key=settings.groq_api_key,
        temperature=0,
        streaming=streaming,
    )


async def stream_answer(question: str):
    docs = similarity_search(question, k=settings.retriever_k)
    messages = PROMPT.format_messages(context=_fmt(docs), question=question)
    async for token in _llm(streaming=True).astream(messages):
        yield token.content


def get_answer_with_sources(question: str) -> dict:
    docs = similarity_search(question, k=settings.retriever_k)
    messages = PROMPT.format_messages(context=_fmt(docs), question=question)
    answer = _llm().invoke(messages).content
    sources = [
        {"content": d.page_content[:300], "source": d.metadata.get("source","unknown"),
         "page": int(d.metadata.get("page", 0)) + 1}
        for d in docs
    ]
    return {"answer": answer, "sources": sources}
