{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, utils }: utils.lib.eachDefaultSystem (system:
    let
      pkgs = nixpkgs.legacyPackages.${system};
      
      mkExtension = name: outputFile: pkgs.stdenvNoCC.mkDerivation {
        inherit name;
        src = ./.;
        
        nativeBuildInputs = [ pkgs.zip ];
        
        buildPhase = ''
          export HOME=$TMPDIR
          bash pack.sh
        '';
        
        installPhase = ''
          mkdir -p $out
          cp ${outputFile} $out/
        '';
      };
    in
      {
        packages = {
          chrome = mkExtension "nykredit-extension-chrome" "chrome.zip";
          firefox = mkExtension "nykredit-extension-firefox" "firefox.xpi";
          default = self.packages.${system}.firefox;
        };
        
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            zip
          ];
        };
      }
  );
}
