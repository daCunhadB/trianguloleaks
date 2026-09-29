(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var busca = document.getElementById("filtro-imagens-texto");
    var licenca = document.getElementById("filtro-imagens-licenca");
    var status = document.getElementById("status-imagens");
    var cartoes = Array.prototype.slice.call(document.querySelectorAll("[data-image-card]"));
    function normalizar(valor) { return String(valor || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    function aplicar() {
      var termo = normalizar(busca.value); var selecionada = licenca.value; var visiveis = 0;
      cartoes.forEach(function (cartao) {
        var mostra = (!termo || normalizar(cartao.getAttribute("data-search")).indexOf(termo) !== -1) && (!selecionada || cartao.getAttribute("data-license") === selecionada);
        cartao.hidden = !mostra; if (mostra) visiveis += 1;
      });
      status.textContent = visiveis + (visiveis === 1 ? " imagem encontrada." : " imagens encontradas.");
    }
    busca.addEventListener("input", aplicar); licenca.addEventListener("change", aplicar);
  });
})();
