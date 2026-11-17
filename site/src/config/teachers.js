// Professores (os "pokémons" do jogo). O nome é o mesmo do arquivo de
// imagem em site/assets/img/.

export const TEACHER_IMAGE_DIR = "assets/img";

export const TEACHER_IMAGES = Object.freeze({
  Fabi: "Fabi.png",
  Murilo: "Murilo.jpg",
  Rodinha: "Rodinha.png",
});

/** Caminho da imagem do professor, ou null se não houver. */
export function teacherImage(name) {
  const file = TEACHER_IMAGES[name];
  return file ? `${TEACHER_IMAGE_DIR}/${file}` : null;
}
