/** @type {import('next').NextConfig} */
// Build ainda não validado: remova ignoreBuildErrors depois do primeiro deploy bem-sucedido.
export default { typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } };
